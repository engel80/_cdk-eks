# CDK EKS Sample

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=engel80_cdk-eks&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=engel80_cdk-eks)  [![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=engel80_cdk-eks&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=engel80_cdk-eks)

EKS sample project with CDK.

## Table of Contents

1. VPC
2. EKS cluster
3. EKS nodegroup
4. Build
5. Deploy

## Prerequisites

```bash
npm install -g aws-cdk@2.27.0

# install packages in the root folder
npm install
cdk bootstrap
```

Use the `cdk` command-line toolkit to interact with your project:

* `cdk deploy`: deploys your app into an AWS account
* `cdk synth`: synthesizes an AWS CloudFormation template for your app
* `cdk diff`: compares your app with the deployed stack
* `cdk watch`: deployment every time a file change is detected

## CDK Stack

|   | Stack                         | Time    |
|---|-------------------------------|---------|
| 1 | VPC                           | 4m      |
| 2 | EKS cluster                   | 13m     |
| 3 | EKS nodegroups                | 10m     |
| 4 | Deploy(including ALB)         | 4m      |
|   | Total                         | 31m     |

## Install

### Step 1: VPC

The VPC ID will be saved into the SSM Parameter Store to refer from other stacks.

Parameter Name: `/cdk-eks/vpc-id`

Use the `-c vpcId` context parameter to use the existing VPC.

```bash
cd vpc
cdk deploy
```

[vpc/lib/vpc-stack.ts](./vpc/lib/vpc-stack.ts)

### Step 2: EKS cluster

```bash
cd ../eks-cluster-nodegroup
cdk deploy 

# or define your VPC id with context parameter
cdk deploy -c vpcId=<vpc-id>
```

[eks-cluster/lib/cluster-stack.ts](./eks-cluster/lib/cluster-stack.ts)

SSM parameter:

* /cdk-eks/vpc-id

Cluster Name: [cluster-config.ts](./cluster-config.ts)

### Step 3: EKS nodegroup

```bash
cd ../eks-nodegroup
cdk deploy 
```

SSM parameters:

* /cdk-eks/vpc-id
* /${clusterName}/openid-connect-provider-arn
* /${clusterName}/kubectl-role-arn

```bash
clusterName: eks-cluster-local, eks-cluster-dev, eks-cluster-stg
```

[eks-nodegroup/lib/nodegroup-stack.ts](./eks-nodegroup/lib/nodegroup-stack.ts)

### Step 4: Build

Create an ECR for sample RESTful API:

```bash
REGION=$(aws configure get default.region)
aws ecr create-repository --repository-name sample-rest-api --region ${REGION}
```

Build and push to ECR:

```bash
REGION=$(aws configure get default.region)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "ACCOUNT_ID: $ACCOUNT_ID"
echo "REGION: $REGION"

cd app
docker build -t sample-rest-api .
docker tag sample-rest-api:latest ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/sample-rest-api:latest
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/sample-rest-api:latest
```

### Step 5: Deploy

Create a YAML file for K8s Deployment, Service, HorizontalPodAutoscaler, and Ingress using a template file.

```bash
sed -e "s|<account-id>|${ACCOUNT_ID}|g" sample-rest-api-template.yaml | sed -e "s|<region>|${REGION}|g" > sample-rest-api.yaml
cat sample-rest-api.yaml
kubectl apply -f sample-rest-api.yaml
```

[app/sample-rest-api-template.yaml](./app/sample-rest-api-template.yaml)

## Uninstall

```bash
find . -name "cdk.context.json" -exec rm -f {} \;
find . -name "cdk.out" -exec rm -rf {} \;

cd eks-nodegroup
cdk destroy

cd ../eks-cluster
cdk destroy

cd ../vpc
cdk destroy
```

## Structure

```text
.
├── build.gradle
├── cluster-config.ts
├── ssm-prefix.ts
├── package-lock.json
├── package.json
├── tsconfig.json
├── app
│   ├── Dockerfile
│   ├── flask_api.py
│   ├── gunicorn.config.py
│   ├── requirements.txt
│   └── sample-rest-api-template.yaml
├── eks-appdeploy
├── eks-cluster
│   ├── bin
│   │   └── index.ts
│   ├── cdk.json
│   ├── jest.config.js
│   └── lib
│       └── cluster-stack.ts
├── eks-cluster-nodegroup
│   ├── bin
│   │   └── index.ts
│   ├── cdk.json
│   ├── jest.config.js
│   └── lib
│       └── cluster-nodegroup-stack.ts
├── eks-nodegroup
│   ├── bin
│   │   └── index.ts
│   ├── cdk.json
│   ├── jest.config.js
│   └── lib
│       └── nodegroup-stack.ts
└── vpc
    ├── bin
    │   └── index.ts
    ├── cdk.json
    └── lib
        └── vpc-stack.ts
```

## Reference

### CDK Lib

* [EKS](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks-readme.html)

* [EKS ALB Controller](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks-readme.html#alb-controller)

* [IAM](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam-readme.html)

* [SSM](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ssm-readme.html)
