//
//  ZKRNUtils.m
//  toeflios
//
//  Created by wansong on 13/05/2017.
//  Copyright © 2017 Facebook. All rights reserved.
//

#import "ZKRNUtils.h"
#import "UIImage+ZKImageUtility.h"

@implementation ZKRNUtils 

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(resizedImage:(NSString *)originalImagePath dimensions:(NSDictionary*)dimensions callback:(RCTResponseSenderBlock)callback) {
  UIImage *originanImage = [UIImage imageWithContentsOfFile:originalImagePath];
  if (!originalImagePath) {
    callback(@[@"failed to load image"]);
    return;
  }
  CGSize destSize;
  if (dimensions[@"width"]) {
    destSize = [self destSizeFromSize:originanImage.size destWidth:[dimensions[@"width"] floatValue]];
  } else if (dimensions[@"height"]) {
    destSize = [self destSizeFromSize:originanImage.size destWidth:[dimensions[@"height"] floatValue]];
  } else {
    callback(@[@"second parameter must either has width or height, the former takes precedence"]);
    return;
  }
  NSString *suffix = [originalImagePath componentsSeparatedByString:@"."].lastObject ?: @"png";
  NSString *destFile = [originalImagePath stringByAppendingFormat:@".%@.%@", NSStringFromClass(self.class), suffix];
  
  UIImage *resizedImage = [originanImage resize:destSize];
  if (!resizedImage) {
    callback(@[@"failed to create resized image"]);
    return;
  }
  if (![UIImagePNGRepresentation(resizedImage) writeToFile:destFile atomically:YES]) {
    callback(@[@"failed to save resized image"]);
    return;
  }
  
  callback(@[[NSNull null], destFile]);
}

- (BOOL)resizeImage:(UIImage *)image size:(CGSize)destSize saveToPath:(NSString*)resizedPath {
  UIImage *resizedImage = [image resize:destSize];
  if (![UIImagePNGRepresentation(resizedImage) writeToFile:resizedPath atomically:YES]) {
    return NO;
  }
  return YES;
}

- (CGSize)destSizeFromSize:(CGSize)originalSize destWidth:(CGFloat)width {
  if (originalSize.width <= 0) {
    return CGSizeZero;
  }
  return CGSizeMake(width, originalSize.height / originalSize.width * width);
}

- (CGSize)destSizeFromSize:(CGSize)originalSize destHeight:(CGFloat)height {
  if (originalSize.height <= 0) {
    return CGSizeZero;
  }
  return CGSizeMake(originalSize.width / originalSize.height * height, height);
}

RCT_EXPORT_METHOD(pathForResource:(NSString*)filename extension:(NSString*)ext callback:(RCTResponseSenderBlock)callback) {
  NSBundle *main = [NSBundle mainBundle];
  NSString *ret = [main pathForResource:filename ofType:ext];
  callback(@[ret ?: @""]);
}
@end
