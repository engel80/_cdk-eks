#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';

import { EksNodegroupStack } from '../lib/nodegroup-stack';
import { CLUSTER_NAME } from '../../cluster-config';

const app = new cdk.App();
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
};
const stage = app.node.tryGetContext('stage') || 'local';

new EksNodegroupStack(app, `${CLUSTER_NAME}-ng-${stage}`, { env });