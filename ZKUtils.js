// @flow
/**
* @Author: wansong
* @Date:   2016-05-27T14:31:23+08:00
* @Email:  betterofsong@gmail.com
*/

import {
  Alert,
} from 'react-native';
import Logger from 'zhike-mobile-logger';
import ErrorMsg from 'zhike-mobile-error';
import Constants from 'zhike-mobile-strings';
import { navigationPushGlobal } from 'zhike-mobile-navigation/actions';

type ExportedType = {
  config: (config:Object) => void,
  toHHMMSS: (timeString:string) => string,
  toYYMMdd: (date:number | string | Object) => string,
  toTBGBMBKBB: (bytes:number, minUnit?:number) => string,
  numberToDigits: (num:number) => Array<number>,
  timeStringToMMddHHmm: (time:string) => string,
  timeToDateWithZero: (timestamp:string) => string,
  intervalInDays: (date1:string|Object, date2:string|Object) => number,
  removeHTMLTag: (str: string) => string,
  mergedStyle: (...args:Array<any>) => any
};

function div(divident, divisor) {
  if (!divisor) {
    throw new Error('divisor must not be 0');
  }
  const divident_ = Math.round(divident);
  const divisor_ = Math.round(divisor);
  return [Math.floor(divident_ / divisor_), divident_ % divisor_];
}

function addZero(timeUnit) {
  const timeString = `${timeUnit}`;
  let returnTime = null;
  if (timeString.length === 1) {
    returnTime = `0${timeUnit}`;
  } else {
    returnTime = `${timeUnit}`;
  }
  return returnTime;
}

function conf(conf) {
  Object.assign(this, conf || {});
}

function ErrorHandlerFactory(module) {
  function ErrorHandler() {
    this.ignoreQueues = {};
    this.handleQueues = {};
  }
  ErrorHandler.prototype.enqueueErrorHandler = function (errorKey, onErrorHandled, onErrorIgnored) {
    const handleQ = this.handleQueues[errorKey] || [];
    this.handleQueues[errorKey] = handleQ;
    handleQ.push(onErrorHandled);

    const ignoreQ = this.ignoreQueues[errorKey] || [];
    this.ignoreQueues[errorKey] = ignoreQ;
    ignoreQ.push(onErrorIgnored);
  };

  ErrorHandler.prototype.ignoreQueuedErrors = function (errorKey) {
    const q = this.ignoreQueues[errorKey];
    this.ignoreQueues[errorKey] = null;
    this.handleQueues[errorKey] = null;
    if (q) {
      for (let i = 0; i < q.length; i++) {
        const callback = q[i];
        callback && callback();
      }
    }
  };

  ErrorHandler.prototype.handleQueuedErrors = function (errorKey) {
    const q = this.handleQueues[errorKey];
    this.ignoreQueues[errorKey] = null;
    this.handleQueues[errorKey] = null;
    if (q) {
      for (let i = 0; i < q.length; i++) {
        const callback = q[i];
        callback && callback();
      }
    }
  };

  ErrorHandler.prototype.handleQueueLength = function (errorKey) {
    const queue = this.handleQueues[errorKey];
    return queue ? queue.length : 0;
  };

  ErrorHandler.prototype.keyForError = function (error) {
    if (error && typeof error.code === 'number') {
      return error.code;
    } else if ({}.hasOwnProperty.call(ErrorMsg, `${error}`)) {
      return error;
    } else {
      console.warn('cannot gen errorKey for error, use defualt one - 0: ', error);
      return 0;
    }
  };

  ErrorHandler.prototype.errorAlertConfigs = function (error) {
    let alertTitle = null;
    let alertMsg = null;
    let positiveActionTitle = null;
    let negativeActionTitle = null;

    if (error && {}.hasOwnProperty.call(error, 'code')) {
      if (error.code === 10) {
        alertTitle =  Constants.ALERT_TITLE_TOKEN_OFF;
        alertMsg = Constants.ALERT_MSG_TOKEN_OFF;
        positiveActionTitle = Constants.ACTION_TITLE_LOGIN_AGAIN;
        negativeActionTitle = Constants.ACTION_TITLE_CANCEL;
      } else {
        alertTitle = error.msg;
        alertMsg = '';
        positiveActionTitle = Constants.ACTION_TITLE_CONFIRM;
      }
    } else if (error === ErrorMsg.ERR_NETWORK_UNAVAILABLE) {
      alertTitle = Constants.ALERT_TITLE_NETWORK_UNAVAILABLE;
      positiveActionTitle = Constants.ACTION_TITLE_RETRY;
    } else if (error === ErrorMsg.ERR_NOT_LOGGED_IN) {
      alertTitle = Constants.ALERT_TITLE_NOT_LOG_IN;
      alertMsg = Constants.ALERT_MSG_NOT_LOG_IN;
      positiveActionTitle = Constants.ACTION_TITLE_LOGIN;
      negativeActionTitle = Constants.ACTION_TITLE_WONT_LOGIN;
    } else if (error === ErrorMsg.ERR_WANT_CELLULAR_NETWORK_USE_PERMIT) {
      alertTitle = Constants.ALERT_TITLE_CELLULAR_NETOWRK_USAGE;
      alertMsg = Constants.ALERT_MSG_CELLULAR_NETOWRK_USAGE;
      positiveActionTitle = Constants.ACTION_TITLE_CONFIRM;
      negativeActionTitle = Constants.ACTION_TITLE_CANCEL;
    } else {
      // unknown errors are processed in silence
      // alertTitle = Constants.ALERT_TITLE_UNKNOW_ERROR;
      // alertMsg = Constants.ALERT_MSG_UNKNOW_ERROR;
      // positiveActionTitle = Constants.ACTION_TITLE_CONFIRM;
      // console.error('failed with error: ', error);
    }

    return {
      alertTitle,
      alertMsg,
      positiveActionTitle,
      negativeActionTitle,
    };
  };

  // handle here means trying to handle, but it is possible user abort the handle process, that count as ignroe
  // so we need to input a onErrorIgnored callback to respond to this
  // 每个error类型，都要有注册一个default_handles对应项
  const _DEFAULT_HANDLERS = (
    function () {
      return {
        getDefaultErrorHandler(errorKey) {
          switch (errorKey) {
          case 10:
          case ErrorMsg.ERR_NOT_LOGGED_IN : {
            return (onErrorHandled, onErrorIgnored) => () => {
              onErrorHandled && onErrorHandled();
              module.exports.store && module.exports.store.dispatch && module.exports.store.dispatch(
                navigationPushGlobal({
                  key:'loginScene',
                  modal: true,
                  modalLevel: 50,
                })
              );
            };
          }
          default:
            return (onErrorHandled, onErrorIgnored) => () => (onErrorHandled && onErrorHandled());
          }
        },
      };
    }
  )();

  ErrorHandler.prototype.handleError = function (error, onErrorHandled_, onErrorIgnored_) {
    const errorKey = this.keyForError(error);
    let onErrorHandled = onErrorHandled_;
    !onErrorHandled && (onErrorHandled = () => null);
    let onErrorIgnored = onErrorIgnored_;
    if (!onErrorIgnored) {
      if (errorKey === 0) {
        onErrorIgnored = () => {
          try {
            const errorStr = error instanceof Error ? error.toString() : JSON.stringify(error);
            Logger.error('ignoring unknown error: %s', errorStr);
          } catch (e) {
            Logger.error('oh.. that error object cannot be converted to json: %s', error);
          }
        };
      } else {
        onErrorIgnored = () => null;
      }
    }

    this.enqueueErrorHandler(errorKey, onErrorHandled, onErrorIgnored);
    const firstQueuedItem = this.handleQueueLength(errorKey) <= 1;
    if (!firstQueuedItem) {
      // explanation: for errors that is handled/ignored immediately, every error occurance is first
      // for errors that is posponed(must be called finally, i.e. alert window is shown, user either handle
      // it or ignore it), same errors are queued until batch processed by the event initiated by the first error
      return;
    }

    const ignoreErrorCallback = () => this.ignoreQueuedErrors(errorKey);
    const handleErrorCallback = _DEFAULT_HANDLERS.getDefaultErrorHandler(errorKey)(
      () => this.handleQueuedErrors(errorKey),
      ignoreErrorCallback,
    );

    const { alertTitle, alertMsg, positiveActionTitle, negativeActionTitle } = this.errorAlertConfigs(error);
    const buttons = [{ text: positiveActionTitle, onPress: handleErrorCallback }];
    if (negativeActionTitle) {
      buttons.push({ text: negativeActionTitle, onPress: ignoreErrorCallback });
    }
    if (alertTitle || alertMsg) {
      Alert.alert(
        alertTitle,
        alertMsg,
        buttons,
      );
    } else {
      // immediately handle error, no queue
      handleErrorCallback();
    }
  };
  return ErrorHandler;
}

const ErrorHandler = ErrorHandlerFactory(module);
const Singleton = new ErrorHandler();

const exported:ExportedType = {
  config: conf,
  toHHMMSS: (secondsStr) => {
    const sec_num = parseInt(`${secondsStr}`, 10); // don't forget the second param
    let hours   = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    let seconds = sec_num - (hours * 3600) - (minutes * 60);

    let hourSeparator = ':';
    const minuteSeparator = ':';

    if (hours === 0) { hours = ''; hourSeparator = ''; }
    if (minutes < 10 && hours !== 0) { minutes = `0${minutes}`; }
    if (seconds < 10) { seconds = `0${seconds}`; }
    const time = hours + hourSeparator + minutes + minuteSeparator + seconds;
    return time;
  },

  toYYMMdd: (date) => {
    date = (typeof date === 'object') ? date : new Date(date); // assume input is Date, number or string
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  },

  toTBGBMBKBB: (bytes, fromLevel = 0) => {
    if (bytes <= 0) {
      return '0B';
    }
    fromLevel = fromLevel || 0;

    let num = Math.floor(bytes / Math.pow(1024, fromLevel));
    const divisor = 1024;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const digites = [];

    while (num > 0) {
      const [res, remain] = div(num, divisor);
      if (fromLevel + digites.length === units.length - 1) {
        digites.push(num);
        break;
      } else {
        digites.push(remain);
      }
      num = res;
    }

    if (!digites.length) {
      return `0${units[fromLevel]}`;
    }

    let ret = '';
    for (let i = 0; i < digites.length; i++) {
      if (ret.length > 0) {
        ret = `${digites[i]}${units[i + fromLevel]} ${ret}`;
      } else {
        ret = `${digites[i]}${units[i + fromLevel]}${ret}`;
      }
    }

    return ret;
  },

// 2016-09-06T15:00:18.000Z 转换成 11-11 10:10
  timeStringToMMddHHmm: (timeString) => {
    if (!timeString || timeString.length === 0 ) {
      return 'null';
    }
    const d = new Date();
    d.setTime(Date.parse(timeString));
    const monthCount = parseInt(`${d.getMonth()}`, 10) + 1;
    const dateCount = d.getDate();
    const hoursCount = d.getHours();
    const minutesCount = d.getMinutes();
    const time = `${addZero(monthCount)}-${addZero(dateCount)} ${addZero(hoursCount)}:${addZero(minutesCount)}`;
    return time;
  },

  // 删除 HTML 多余的 <br/> <b/> &nbsp 行尾空白 标签
  removeHTMLTag: (str) => {
    str = str.replace(/<\/?[^>]*>/g,'');
    str = str.replace(/[ | ]*\n/g,'\n');
    str = str.replace(/&nbsp;/ig,'');
    return str;
  },

// TODO:fix 补全0
  timeToDateWithZero: (timeStamp) => {
  // addZero(monthCount)
    const date = new Date(timeStamp);
    const year = `${date.getFullYear()}-`;
    const month = `${date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1}-`;
    const day = `${addZero(date.getDate())} `;
    const hour = `${addZero(date.getHours())}:`;
    const min = addZero(date.getMinutes());

    const time = year + month + day + hour + min;

    return time;
  },

  intervalInDays: (d1, d2) => {
    d1 = typeof d1 === 'string' ? new Date(d1) : d1;
    d2 = typeof d2 === 'string' ? new Date(d2) : d2;
    return Math.floor((d2.getTime() - d1.getTime()) / 86400000.0);
  },

  numberToDigits: (num:number = 0, length:number = 3, base:number = 10) => {
    const ret = [];
    let remain = Math.max(0, num);
    while (remain > 0 || ret.length < length) {
      ret.push(remain % base);
      remain = Math.floor(remain / base);
    }
    return ret;
  },

  mergedStyle(...args) {
    if (args.length === 1) {
      return args[0] || {};
    }
    return args.reduce(
      (ret, item) => (Array.isArray(item) ?
        ret.concat(item)
        : [...ret, item]
        ),
      []
    );
  },
  handleError: ErrorHandler.prototype.handleError.bind(Singleton),
  __PRIVATE_SINGLETON: Singleton, // refer the object to keep it from being released?
};

module.exports = exported;
