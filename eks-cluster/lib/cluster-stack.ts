import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

import { CLUSTER_NAME } from './cluster-config';
import { INSTANCE_TYPE } from './cluster-config';
import { SSM_PREFIX } from '../../ssm-prefix';

/**
 * Total time: 1355.39s
 * 
 * AmazonSSMManagedInstanceCore role is added to connect to EC2 instance by using SSM on AWS web console
 */
export class EksClusterStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const stage = this.node.tryGetContext('stage') || 'local';
        const vpcId = this.node.tryGetContext('vpcId') || ssm.StringParameter.valueFromLookup(this, `${SSM_PREFIX}/vpc-id`);
        const vpc = ec2.Vpc.fromLookup(this, 'vpc', { vpcId: vpcId });

        const clusterAdmin = new iam.Role(this, 'cluster-admin-role', {
            assumedBy: new iam.AccountRootPrincipal()
        });
        const clusterRole = new iam.Role(this, 'cluster-role', {
            roleName: `EksClusterRole-${id}`,
            assumedBy: new iam.ServicePrincipal("eks.amazonaws.com"),
        });
        clusterRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSServicePolicy"));
        clusterRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSClusterPolicy"));

        const clusterName = `${CLUSTER_NAME}-${stage}`;
        const cluster = new eks.Cluster(this, 'eks-cluster', {
            clusterName: clusterName,
            tags: {
                Stage: stage,
                Name: clusterName,
            },
            mastersRole: clusterAdmin,
            role: clusterRole,
            version: eks.KubernetesVersion.V1_21,
            vpc: vpc,
            defaultCapacity: 0,
            // albController: {
            //     version: eks.AlbControllerVersion.V2_4_1,
            // },
            clusterLogging: [
                eks.ClusterLoggingTypes.API,
                eks.ClusterLoggingTypes.SCHEDULER
            ],
        });
        cluster.defaultNodegroup?.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

        const certParam = new ssm.StringParameter(this, 'ssmClutsterCertificateAuthority',
            { parameterName: `/${clusterName}/cluster-certificate-authority`, stringValue: cluster.clusterCertificateAuthorityData });
        const openIdConnectProviderArn = new ssm.StringParameter(this, 'ssmOpenIdConnectProviderArn',
            { parameterName: `/${clusterName}/openid-connect-provider-arn`, stringValue: cluster.openIdConnectProvider.openIdConnectProviderArn });
        const kubectlRole = new ssm.StringParameter(this, 'ssmKubectlRole',
            { parameterName: `/${clusterName}/kubectl-role-arn`, stringValue: cluster.kubectlRole?.roleArn as string });

        new CfnOutput(this, 'SSMClutsterCertificateAuthority', { value: certParam.parameterName });
        new CfnOutput(this, 'SSMopenIdConnectProviderArn', { value: openIdConnectProviderArn.parameterName });
        new CfnOutput(this, 'SSMopenIdConnectProviderArnValue', { value: openIdConnectProviderArn.stringValue });
        new CfnOutput(this, 'SSMKubectlRoleArnValue', { value: kubectlRole.stringValue });

        new CfnOutput(this, 'WebConsoleUrl', { value: `https://${this.region}.console.aws.amazon.com/eks/home?region=us-east-1#/clusters/${cluster.clusterName}` });
        new CfnOutput(this, 'ClusterName', { value: cluster.clusterName });
        new CfnOutput(this, 'ClusterArn', { value: cluster.clusterArn });
        new CfnOutput(this, 'ClusterEndpoint', { value: cluster.clusterEndpoint });
        new CfnOutput(this, 'ClusterSecurityGroupId', { value: cluster.clusterSecurityGroupId });
        new CfnOutput(this, 'ClusterEncryptionConfigKeyArn', { value: cluster.clusterEncryptionConfigKeyArn });
        new CfnOutput(this, 'ClusterOpenIdConnectIssuer', { value: cluster.clusterOpenIdConnectIssuer });
        new CfnOutput(this, 'ClusterOpenIdConnectIssuerUrl', { value: cluster.clusterOpenIdConnectIssuerUrl });
    }
}
