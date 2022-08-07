#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';

import { EksClusterStack } from '../lib/cluster-stack';
import { CLUSTER_NAME } from '../../cluster-config';

const app = new cdk.App();
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
};
const stage = app.node.tryGetContext('stage') || 'local';

new EksClusterStack(app, `${CLUSTER_NAME}-${stage}`, { env });