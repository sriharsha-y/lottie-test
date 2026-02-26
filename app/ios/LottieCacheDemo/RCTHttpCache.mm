#import "RCTHttpCache.h"

@implementation RCTHttpCache

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeHttpCacheSpecJSI>(params);
}

- (void)clearCache:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [[NSURLCache sharedURLCache] removeAllCachedResponses];
  resolve(nil);
}

+ (NSString *)moduleName {
  return @"HttpCache";
}

@end
