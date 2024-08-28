import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import InfraStack from "../ponderStack";

export function createCDN(stack: InfraStack) {
  const cdnOrigin = new origins.LoadBalancerV2Origin(stack.alb, {
    connectionAttempts: 3,
    connectionTimeout: cdk.Duration.seconds(10),
    readTimeout: cdk.Duration.seconds(30),
    keepaliveTimeout: cdk.Duration.seconds(5),
    protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
  });

  //   const anCert = acm.Certificate.fromCertificateArn(
  //     stack,
  //     "CDNCertificateARN",
  //     "ARN"
  //   );

  const cdn = new cloudfront.Distribution(stack, "PonderDistribution", {
    defaultBehavior: {
      origin: cdnOrigin,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      compress: true,
    },
    // domainNames: ["adityanama.com"],
    // certificate: anCert,
    priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
  });

  stack.cdn = cdn;

  return cdn;
}
