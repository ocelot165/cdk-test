import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import InfraStack from "../ponderStack";

export function createCDN(stack: InfraStack) {
  const cdnOrigin = new origins.LoadBalancerV2Origin(stack.alb, {
    connectionAttempts: 3,
    connectionTimeout: cdk.Duration.seconds(10),
    readTimeout: cdk.Duration.seconds(30),
    keepaliveTimeout: cdk.Duration.seconds(5),
    protocolPolicy: cloudfront.OriginProtocolPolicy.MATCH_VIEWER,
  });

  const cdn = new cloudfront.Distribution(stack, "PonderDistribution", {
    defaultBehavior: {
      origin: cdnOrigin,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      compress: true,
    },
    priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
  });

  stack.cdn = cdn;

  return cdn;
}
