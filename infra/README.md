# OUTPICK 첫 EC2 구성

서울 리전에 Ubuntu 24.04 LTS 서버 한 대와 SSH 접속에 필요한 네트워크를 준비합니다. EC2 첫 부팅 때 Docker와 Compose를 자동으로 설치합니다. 기존 키 페어와 EIP는 조회해서 사용하며, EIP와 EC2의 연결은 Terraform이 관리합니다.

## 이번 작업의 결과 확인하기

1. `terraform init`으로 AWS를 다루는 구성요소인 Provider를 내려받습니다.
2. `terraform fmt -check`와 `terraform validate`로 형식과 문법을 검사합니다.
3. `terraform plan`으로 생성 예정 목록을 확인합니다.

`plan`은 AWS 정보를 조회하지만 리소스를 생성하지 않습니다. 오류 없이 완료되고, 예정 목록에 아래 구성이 표시되는지 확인합니다.

- EC2 `t3.small` 한 대와 암호화된 gp3 20GiB 루트 디스크
- VPC 한 개와 퍼블릭 서브넷 한 개
- 인터넷 게이트웨이, 퍼블릭 라우팅 테이블과 서브넷 연결
- 현재 공인 IPv4 주소 한 개에서만 TCP 22번 SSH 접속을 허용하는 보안 그룹
- EC2에 연결하는 네트워크 인터페이스와 기존 EIP의 연결
- VPC 생성 시 AWS가 함께 만드는 기본 보안 그룹·라우팅 테이블·네트워크 ACL의 관리 설정

VPC는 프로젝트의 네트워크이고, 서브넷은 그 안에서 서버를 배치할 구역입니다. 인터넷 게이트웨이와 라우팅 테이블은 인터넷으로 통신할 경로를 정합니다. 보안 그룹은 서버 접속 허용 규칙이고, 네트워크 ACL은 서브넷을 통과하는 통신 규칙입니다. 네트워크 인터페이스는 서버의 네트워크 연결입니다.

Terraform이 생성·관리하는 모든 태그 지원 대상에 `Team = devcos-team05`, `Project = outpick`, `ManagedBy = terraform`을 적용합니다. `Name` 값에는 `devcos-team05--` 접두사를 붙입니다. 디스크·네트워크 인터페이스와 VPC의 기본 리소스에도 태그를 적용합니다. 라우팅 테이블 연결과 탄력적 IP 연결은 별도의 태그를 지원하지 않으므로, 연결 대상 리소스로 식별합니다.

HTTP 80번은 Nginx를 통한 외부 API 접속에 허용합니다. SSH 22번은 기존처럼 운영자 IP만 허용합니다. HTTPS 443번도 Nginx에 허용합니다. 앱 8080번과 MySQL 3306번 포트는 외부에 열지 않습니다. 도메인 연결 후 [EC2 배포 통합 안내](deploy.md)를 따릅니다. 배포 자동화, S3와 RDS는 포함하지 않습니다.

## 프로젝트 계정과 키 페어 확인하기

프로젝트 루트에서 다음을 실행합니다.

```bash
aws sts get-caller-identity --profile outpick
```

`Account`가 데브코스 콘솔의 계정 ID와 일치하는지 확인합니다. 같은 계정의 서울 리전에 `devcos-team05--ec2-keypair`가 있어야 합니다.

```bash
aws ec2 describe-key-pairs --profile outpick --region ap-northeast-2 --key-names devcos-team05--ec2-keypair --query 'KeyPairs[].{Name:KeyName,Tags:Tags}'
```

키 이름이 반환되는지 확인합니다. 이 키는 콘솔에서 직접 관리하므로 Terraform의 공통 태그가 적용되지 않습니다. 콘솔에서 `Name = devcos-team05--ec2-keypair`, `Team = devcos-team05` 태그도 확인합니다.

Terraform은 키를 이름으로 조회하며 생성·삭제하지 않습니다. Terraform을 실행하는 PC에 개인 키 파일은 필요하지 않습니다. 개인 키는 이후 SSH 접속할 때 사용합니다.

## 기존 EIP 준비하기

현재 Terraform은 EIP를 생성·삭제하지 않고 `data.aws_eip.app`으로 조회합니다. EC2와 EIP의 연결만 `aws_eip_association.app`으로 관리합니다. 전체 `destroy` 후에도 EIP 자체는 남고, 다음 `apply`에서 같은 주소를 다시 연결합니다. 예전 EIP 관리 전환 작업을 반복할 필요는 없습니다.

서울 리전 콘솔의 **EC2 → 탄력적 IP**에서 우리 팀 EIP의 할당 ID와 IPv4 주소를 확인합니다. 할당 ID는 `eipalloc-…` 형식입니다. `terraform.tfvars`의 `eip_allocation_id`에 등록합니다.

EIP가 없다면 콘솔에서 한 개를 먼저 할당하고 `Name = devcos-team05--eip`, `Team = devcos-team05`, `Project = outpick` 태그를 지정합니다. 기존 EIP가 있다면 새로 할당하지 않습니다. EIP 태그는 콘솔에서 관리합니다.

도메인 `outpick.chocobe.shop`의 A 레코드는 이 EIP를 가리켜야 합니다. 프로젝트 종료 시 EIP는 콘솔에서 직접 해제합니다. 해제한 주소의 재확보는 보장되지 않으므로 새 EIP를 사용하면 할당 ID와 DNS도 변경합니다.

## 내 설정 파일 만들기

프로젝트 루트에서 작업 디렉터리로 이동합니다.

```bash
cd infra
```

설정 파일은 최초 한 번만 복사합니다. 기존 `terraform.tfvars`가 있다면 덮어쓰지 않고 필요한 항목만 수정합니다.

```bash
cp -n terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars`의 다음 값을 실제 값으로 바꿉니다.

- `aws_account_id`: 앞서 확인한 데브코스 AWS 계정 ID
- `ssh_allowed_cidr`: 현재 공인 IPv4 주소 뒤에 `/32`를 붙인 값
- `eip_allocation_id`: 서울 리전에 보관 중인 팀 EIP의 할당 ID

현재 네트워크의 공인 IP는 다음으로 확인합니다.

```bash
curl --fail --silent --show-error https://checkip.amazonaws.com
```

예를 들어 `203.0.113.10`이 나오면 `ssh_allowed_cidr = "203.0.113.10/32"`로 작성합니다. `/32`는 해당 IPv4 주소 하나만 허용한다는 뜻입니다. 네트워크나 VPN을 바꿨다면 실제 SSH 접속에 사용할 IP인지 다시 확인합니다.

`terraform.tfvars`는 Git에서 제외합니다. AWS 액세스 키와 비밀 키는 이 파일에 넣지 않습니다. Provider는 `outpick` 프로필을 사용하고, `aws_account_id`와 실제 인증 계정이 다르면 실행을 중단합니다.

## 생성 예정 목록 확인하기

아래 명령은 `infra/`에서 순서대로 실행합니다.

```bash
terraform init
```

Provider 다운로드가 끝나고 초기화 성공 안내가 나오는지 확인합니다. 생성되는 `.terraform.lock.hcl`은 Provider의 선택 버전과 검증 정보를 기록하므로 Git에 포함합니다. 내려받은 파일이 있는 `.terraform/`는 제외합니다.

```bash
terraform fmt -check
terraform validate
```

`fmt -check`는 수정이 필요 없으면 출력 없이 끝납니다. `validate`는 `Success! The configuration is valid.`를 출력해야 합니다.

```bash
terraform plan -input=false -out=preview.tfplan
```

생성 예정 목록에서 다음을 확인합니다.

- 처음 생성한다면 `Plan: 12 to add, 0 to change, 0 to destroy.`가 나오는지. 이미 생성한 서버라면 신규 생성 수가 아니라 의도한 변경 목록과 일치하는지 확인합니다.
- EC2가 `t3.small`, 디스크가 `gp3` 20GiB인지
- 기존 키 이름이 `devcos-team05--ec2-keypair`인지
- SSH 규칙에 내 IP의 `/32`만 있는지
- 태그 지원 리소스의 이름과 팀 태그가 빠지지 않았는지

12개는 Terraform이 관리할 항목 수입니다. 기존 키 페어·EIP·Ubuntu 이미지는 조회만 하므로 이 수에 포함되지 않습니다. VPC 기본 리소스 세 개는 AWS가 VPC와 함께 만들고 Terraform이 관리합니다. 같은 계정의 다른 팀 리소스는 가져오거나 수정하지 않습니다.

`known after apply`는 AWS가 생성한 뒤 정해지는 ID나 IP라는 뜻입니다. `plan` 시점에 보이는 정상적인 표시입니다. `preview.tfplan`은 이번 계획을 저장한 파일이며 Git에서 제외합니다. 아래 명령으로 다시 읽을 수 있습니다.

```bash
terraform show preview.tfplan
```

`plan` 성공은 생성 권한·용량·SSH 접속까지 검증한 결과가 아닙니다. 생성 API 권한, 실제 기동과 SSH 접속은 `apply` 단계에서 확인합니다. 다음 절의 주의사항까지 확인한 뒤 생성합니다.

## 실제 생성 전에 확인하기

콘솔에서 관리하는 기존 키 페어에도 팀 식별 태그가 있는지 확인합니다. Terraform은 해당 키를 조회만 하므로 키의 태그를 자동으로 추가하지 않습니다.

Terraform은 관리 중인 AWS 리소스 ID를 상태 파일에 기록합니다. 현재 설정은 `infra/`의 로컬 상태 파일을 사용하며, 상태 파일과 백업은 Git에서 제외합니다. 실제 생성 전 보관·복구 방식을 정합니다. 여러 PC에서 같은 인프라를 관리하기 전에는 상태 파일 공유 방식도 정해야 합니다. 상태 없이 다른 PC에서 실행하면 기존 인프라를 기억하지 못합니다.

Ubuntu 이미지는 Canonical의 최신 24.04 LTS 이미지를 조회합니다. 시간이 지나 이미지가 바뀌면 이후 `plan`에서 EC2 교체가 제안될 수 있으므로 매번 변경 목록을 확인합니다.

CPU 크레딧 모드는 `standard`로 지정합니다. 크레딧을 소진하면 기본 CPU 성능으로 제한됩니다. 추후 부하 테스트에서는 크레딧 잔량도 함께 확인합니다.

루트 디스크는 EC2 삭제 시 함께 삭제하도록 설정했습니다. 이후 같은 디스크에 MySQL 데이터를 저장하면 EC2 삭제·교체 시 데이터도 사라질 수 있습니다. 기존 DB를 유지해야 한다면 서버 교체·삭제 전에 별도로 백업합니다. 인증서 백업과 초기 장소 수집은 DB 전체를 복구하지 않습니다. `destroy`는 Terraform이 관리하는 인프라를 삭제하는 명령이며, 현재 상태의 로컬 파일을 지워서는 삭제되지 않습니다. 기존 키 페어와 EIP는 Terraform 삭제 대상에 포함되지 않습니다. EIP 연결은 삭제되지만 EIP 자체는 남습니다. 프로젝트 종료 시 EIP는 콘솔에서 직접 해제합니다.

## 인프라 생성하기

앞서 `preview.tfplan`을 생성한 같은 `infra/` 디렉터리에서 실행합니다.

```bash
terraform apply preview.tfplan
terraform output -raw public_ip
```

이 명령은 저장한 계획을 적용합니다. 계획을 만든 뒤 코드나 설정을 바꿨다면 이전 계획을 쓰지 말고 다시 `plan`을 생성해 검토합니다. `apply`가 끝나면 [새 EC2 배포 안내](deploy.md)로 이동해 SSH·Docker 확인부터 진행합니다.

## Docker 자동 설치와 변경 시 주의사항

`scripts/install-docker.sh`는 `main.tf`의 `user_data`로 연결되어 있습니다. EC2 내부 cloud-init이 첫 부팅 때 root 권한으로 Docker Engine·CLI·containerd·Buildx·Compose를 설치하고 서비스를 활성화합니다. Ubuntu 사용자를 Docker 그룹에 추가합니다. 실제 설치 완료 확인은 [배포 안내 1번](deploy.md#1-ssh-접속과-docker-준비-확인)에 있습니다.

EIP 연결 전에 다운로드가 시작되거나 APT 잠금이 걸릴 수 있어 재시도와 대기를 사용합니다. 앱 이미지 다운로드·설정 파일 복사·앱 실행은 자동 설치에 포함하지 않습니다.

`user_data_replace_on_change = true`이므로 설치 스크립트가 바뀌면 이후 계획에서 EC2 교체가 나올 수 있습니다. 최신 Ubuntu AMI 조회 결과가 바뀌는 경우도 있으므로 변경 때마다 계획을 확인합니다. 기존 서버의 파일과 Docker 볼륨이 필요하면 교체 전 백업합니다.

## Nginx 외부 HTTP 접속 허용하기

현재 보안 그룹 코드는 HTTP 80번과 HTTPS 443번을 외부에 허용합니다. 별도의 과거 HTTP·HTTPS 추가 작업은 반복하지 않습니다. 앱·DB 포트를 외부에 추가로 열지 않습니다.

포트·Docker 구성 변경이 필요하면 새 계획을 검토하고 적용합니다. 의도하지 않은 EC2 교체·삭제가 있으면 원인을 확인합니다. Nginx 파일 업로드와 앱 실행은 [배포 통합 안내](deploy.md)에서 진행합니다.

## 공식 문서

- [AWS Provider 설정](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [기존 EC2 키 페어 조회](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/key_pair)
- [Canonical Ubuntu 이미지 확인](https://documentation.ubuntu.com/aws/aws-how-to/instances/find-ubuntu-images/)
- [Terraform plan](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Docker Ubuntu 설치](https://docs.docker.com/engine/install/ubuntu/)
- [Docker 일반 사용자 실행 설정](https://docs.docker.com/engine/install/linux-postinstall/)
- [EC2 user data 실행](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html)
