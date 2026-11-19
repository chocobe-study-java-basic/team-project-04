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

HTTP 80번은 Nginx를 통한 외부 API 접속에 허용합니다. SSH 22번은 기존처럼 운영자 IP만 허용합니다. HTTPS 443번도 Nginx에 허용합니다. 앱 8080번과 MySQL 3306번 포트는 외부에 열지 않습니다. 도메인 연결 후 [HTTPS 실행·인증서 백업과 복원 안내](https.md)를 따릅니다. 배포 자동화, S3와 RDS는 포함하지 않습니다.

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

## 기존 EIP를 보존하면서 조회 방식으로 전환하기

이번 결과물은 전체 `destroy` 후 다시 `apply`해도 같은 EIP를 새 EC2에 연결하는 구성입니다. `chocobe.shop`의 DNS에는 이 EIP를 등록합니다. DNS 설정은 별도 작업입니다.

이미 Terraform으로 생성한 EIP가 있다면 새 EIP를 할당하지 않습니다. `main.tf`의 `removed` 블록은 `aws_eip.app`을 상태 파일의 관리 목록에서 제외하며, `destroy = false`로 실제 EIP를 보존합니다. 이 기능을 사용하므로 Terraform 1.7 이상이 필요합니다. 전환 기록인 `removed` 블록은 저장소에 유지합니다.

1. AWS 콘솔의 서울 리전에서 **EC2 → 탄력적 IP**를 엽니다. 우리 팀 EIP의 **할당 ID**와 IPv4 주소를 확인합니다. 할당 ID는 IP 주소와 별개인 `eipalloc-…` 형식의 식별자입니다.
2. 로컬 `infra/terraform.tfvars`의 `eip_allocation_id`에 이 ID를 입력합니다. 이번 전환에서는 기존 상태 파일에 기록된 EIP의 ID와 같아야 합니다.
3. Mac의 프로젝트 루트에서 다음 명령을 순서대로 실행합니다.

```bash
terraform -chdir=infra fmt -check
terraform -chdir=infra validate
terraform -chdir=infra plan -input=false
```

계획에서 `aws_eip.app`이 실제로 삭제되지 않고 더 이상 관리되지 않는다는 안내를 확인합니다. EIP 할당 ID와 `public_ip` 출력은 기존 값과 같아야 합니다. 이번 전환만 있다면 리소스 생성·변경·삭제는 모두 0개이며 관리 제외 1개가 표시됩니다. EIP 연결 변경이나 EC2 교체가 보이면 적용 전에 원인을 확인합니다. 최신 Ubuntu 이미지가 바뀌면 별도의 EC2 교체가 제안될 수 있습니다.

계획을 확인한 뒤 다음 명령을 실행합니다. 이 명령은 계획을 다시 보여주고 승인받은 후 상태 파일에 전환을 반영합니다. 이번 전환 때문에 전체 `destroy`를 먼저 실행하지 않습니다.

```bash
terraform -chdir=infra apply
```

전환 적용 후 다음 명령으로 관리 목록과 IP를 확인합니다.

```bash
terraform -chdir=infra state list
terraform -chdir=infra output -raw public_ip
```

관리 목록에 `data.aws_eip.app`과 `aws_eip_association.app`은 있고 `aws_eip.app`은 없어야 합니다. `public_ip`가 전환 전과 같고 브라우저에서 기존 화면·API 응답이 유지되면 전환 완료입니다. 전체 삭제·재생성 검증은 서버 파일과 DB 데이터를 지워도 되는 시점에 별도로 진행합니다.

처음 사용하는 계정에 보관된 EIP가 없다면 서울 리전 콘솔에서 EIP 한 개를 먼저 할당합니다. `Name = devcos-team05--eip`, `Team = devcos-team05`, `Project = outpick` 태그를 지정하고 할당 ID를 설정합니다. 기존 EIP의 태그는 조회 코드가 변경하지 않으므로 콘솔에서 관리합니다. 이전 Terraform 생성 시 남은 `ManagedBy = terraform` 태그는 콘솔에서 제거해 실제 관리 방식과 맞춥니다.

EIP는 EC2가 없어도 AWS에 남으며 미연결 상태에서도 요금이 발생합니다. 프로젝트 종료 시 콘솔에서 EIP를 해제합니다. 해제한 주소는 재확보가 보장되지 않으며, 새 EIP를 쓰려면 할당 ID와 DNS의 IP를 함께 갱신해야 합니다.

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

- 처음 생성한다면 `Plan: 12 to add, 0 to change, 0 to destroy.`가 나오는지. 이미 생성한 서버에 변경을 적용한다면 아래의 Docker 설치 계획을 확인합니다.
- EC2가 `t3.small`, 디스크가 `gp3` 20GiB인지
- 기존 키 이름이 `devcos-team05--ec2-keypair`인지
- SSH 규칙에 내 IP의 `/32`만 있는지
- 태그 지원 리소스의 이름과 팀 태그가 빠지지 않았는지

12개는 Terraform이 관리할 항목 수입니다. 기존 키 페어·EIP·Ubuntu 이미지는 조회만 하므로 이 수에 포함되지 않습니다. VPC 기본 리소스 세 개는 AWS가 VPC와 함께 만들고 Terraform이 관리합니다. 같은 계정의 다른 팀 리소스는 가져오거나 수정하지 않습니다.

`known after apply`는 AWS가 생성한 뒤 정해지는 ID나 IP라는 뜻입니다. `plan` 시점에 보이는 정상적인 표시입니다. `preview.tfplan`은 이번 계획을 저장한 파일이며 Git에서 제외합니다. 아래 명령으로 다시 읽을 수 있습니다.

```bash
terraform show preview.tfplan
```

`plan` 성공은 생성 권한·용량·SSH 접속까지 검증한 결과가 아닙니다. 생성 API 권한, 실제 기동과 SSH 접속은 `apply` 단계에서 확인합니다. 이번에는 `apply`를 실행하지 않습니다.

## 실제 생성 전에 확인하기

콘솔에서 관리하는 기존 키 페어에도 팀 식별 태그가 있는지 확인합니다. Terraform은 해당 키를 조회만 하므로 키의 태그를 자동으로 추가하지 않습니다.

Terraform은 관리 중인 AWS 리소스 ID를 상태 파일에 기록합니다. 현재 설정은 `infra/`의 로컬 상태 파일을 사용하며, 상태 파일과 백업은 Git에서 제외합니다. 실제 생성 전 보관·복구 방식을 정합니다. 여러 PC에서 같은 인프라를 관리하기 전에는 상태 파일 공유 방식도 정해야 합니다. 상태 없이 다른 PC에서 실행하면 기존 인프라를 기억하지 못합니다.

Ubuntu 이미지는 Canonical의 최신 24.04 LTS 이미지를 조회합니다. 시간이 지나 이미지가 바뀌면 이후 `plan`에서 EC2 교체가 제안될 수 있으므로 매번 변경 목록을 확인합니다.

CPU 크레딧 모드는 `standard`로 지정합니다. 크레딧을 소진하면 기본 CPU 성능으로 제한됩니다. 추후 부하 테스트에서는 크레딧 잔량도 함께 확인합니다.

루트 디스크는 EC2 삭제 시 함께 삭제하도록 설정했습니다. 이후 같은 디스크에 MySQL 데이터를 저장하면 EC2 삭제·교체 시 데이터도 사라질 수 있습니다. DB 배포 전에 백업·복원과 디스크 보존 방식을 정합니다. `destroy`는 Terraform이 관리하는 인프라를 삭제하는 명령이며, 현재 상태의 로컬 파일을 지워서는 삭제되지 않습니다. 기존 키 페어와 EIP는 Terraform 삭제 대상에 포함되지 않습니다. EIP 연결은 삭제되지만 EIP 자체는 남습니다. 프로젝트 종료 시 EIP는 콘솔에서 직접 해제합니다.

## EC2 첫 부팅 때 Docker 설치하기

`scripts/install-docker.sh`를 `main.tf`의 `user_data`에서 읽어 EC2에 전달합니다. EC2 내부의 cloud-init이 첫 부팅 때 root 권한으로 스크립트를 실행합니다. Terraform이 SSH로 접속해서 설치하는 방식은 아닙니다.

스크립트는 Docker 공식 APT 저장소를 등록하고 Docker Engine·CLI·containerd·Buildx·Compose 플러그인을 설치합니다. Docker와 containerd를 부팅 시 자동 실행하고, `ubuntu`를 `docker` 그룹에 추가합니다. 이 그룹은 Docker를 통해 관리자 수준의 작업을 수행할 수 있으므로 운영 담당 계정에만 부여합니다. 패키지는 설치 시점의 공식 stable 버전을 사용하며 특정 버전에 고정하지 않았습니다.

EC2는 퍼블릭 라우팅 테이블과 서브넷 연결이 준비된 후 생성합니다. EIP 연결은 EC2 생성 후 별도로 진행하므로, 첫 다운로드가 일찍 시작되거나 APT 잠금이 걸려 있을 때를 대비해 재시도와 잠금 대기를 설정했습니다. 계속되는 통신 오류는 설치 실패로 남습니다. 앱 이미지 pull, Compose 파일·DB 비밀번호 전달, Backend·MySQL 실행은 이 스크립트에 포함하지 않습니다.

### 변경 계획과 적용

아래 명령은 `infra/`에서 실행합니다.

```bash
bash -n scripts/install-docker.sh
terraform fmt -check
terraform validate
terraform plan -input=false -out=docker-bootstrap.tfplan
```

`user_data_replace_on_change = true`이므로 기존 서버에 스크립트를 처음 추가하거나 내용을 수정하면 EC2 교체가 계획됩니다. 계획의 `aws_instance.app`에 교체 표시가 있는지 확인합니다. VPC·서브넷·EIP는 그대로 유지되는지, 연결 리소스에 어떤 변경이 있는지도 확인합니다. 전체 `destroy`는 필요하지 않습니다.

EC2 교체 시 기존 루트 디스크와 그 안의 파일·Docker 볼륨도 삭제됩니다. 서버에 보존할 파일이나 DB 데이터가 있다면 먼저 백업합니다. 검토한 계획을 적용할 때만 다음 명령을 실행합니다.

```bash
terraform apply docker-bootstrap.tfplan
```

`apply` 성공은 EC2 생성 완료를 뜻하며, 설치 스크립트의 성공까지 기다리는 것은 아닙니다. EIP를 계속 보유하면 접속 IP는 유지되지만 새 서버의 SSH 호스트 키는 달라질 수 있습니다. SSH가 키 변경을 경고하면 콘솔에서 교체된 인스턴스와 EIP를 확인한 후 해당 IP의 기존 known_hosts 항목만 갱신합니다.

### 설치 완료 확인

새 EC2에 SSH로 접속한 터미널에서 실행합니다.

```bash
sudo cloud-init status --wait
```

정상 완료 시 `status: done`을 확인합니다. SSH가 먼저 열리더라도 Docker 설치에는 몇 분 더 걸릴 수 있습니다. 설치가 끝난 후 SSH 접속을 종료하고 다시 접속하면 새 `docker` 그룹 권한이 적용됩니다.

```bash
docker --version
docker compose version
systemctl is-active docker
docker run --rm hello-world
```

Docker·Compose 버전, `active`, `Hello from Docker!` 메시지가 나오면 설치와 일반 사용자 실행 권한까지 확인한 것입니다. `hello-world`는 Docker Hub에서 테스트 이미지를 받아 실행하고 컨테이너를 삭제합니다.

### 실패 원인 확인

설치가 실패하면 다음 로그에서 오류를 확인합니다.

```bash
sudo tail -n 100 /var/log/cloud-init-output.log
sudo journalctl -u cloud-final --no-pager -n 100
```

스크립트 성공 시 출력 로그에 `Docker setup completed`가 남습니다. 오류 시 `Docker setup failed at line ...` 앞의 명령 출력을 확인합니다. Docker 서비스 문제는 `sudo journalctl -u docker --no-pager -n 100`으로 확인합니다. 단순 재부팅으로 최초 부팅용 스크립트가 다시 실행되지는 않습니다.

## Nginx 외부 HTTP 접속 허용하기

`main.tf`의 EC2 보안 그룹에서 TCP 80번을 모든 IPv4 주소에 허용합니다. Nginx 컨테이너와 설정 파일의 실행·복사는 Terraform이 아닌 배포용 Compose로 진행합니다. [Nginx 적용 안내](../backend/README.md#nginx로-외부-api-접속하기)를 참고합니다.

내 Mac의 프로젝트 루트에서 다음 명령으로 변경 계획을 확인합니다. `plan`은 AWS 리소스를 변경하지 않습니다.

```bash
terraform -chdir=infra plan
```

기존 인프라가 실행 중이라면 이번 변경은 보안 그룹의 HTTP 규칙 추가만 의도합니다. EC2 교체가 나온다면 적용을 멈추고 원인을 확인합니다. 서버를 생성한 이후 최신 AMI가 달라진 경우에도 교체가 제안될 수 있습니다. EIP 관리 전환을 적용한 이후 전체 `destroy` 후라면 12개 신규 생성이 정상이며 보관 중인 EIP를 다시 연결합니다. 예상한 변경만 있다면 다음 명령을 실행하고 계획을 다시 확인한 뒤 승인합니다.

```bash
terraform -chdir=infra apply
```

저장된 과거 `docker-bootstrap.tfplan`을 사용하지 않습니다. 이 작업 때문에 전체 `destroy`를 실행할 필요는 없습니다.

## 검증 기록

2026-11-16에 Terraform 1.17.1과 AWS Provider 6.73.0으로 초기화, 형식 검사, 문법 검사와 실제 AWS 조회를 사용하는 `plan`을 확인했습니다. 계획은 추가 13개, 변경 0개, 삭제 0개입니다. Ubuntu 24.04 LTS x86_64 이미지와 기존 키 페어 조회도 성공했습니다.

최초 작성 시 저장된 계획에서 팀 태그, SSH 한 개 IP 허용, `t3.small`과 암호화된 gp3 20GiB 설정을 확인했습니다. 당시 기존 키 페어에는 태그가 없어 콘솔에서 태그를 추가하도록 안내했습니다. 이후 사용자가 직접 인프라 생성·삭제·재생성과 SSH 접속을 확인했습니다.

Docker 자동 설치 추가 후 `bash -n`, `terraform fmt -check`, `terraform validate`, `git diff --check`를 통과했습니다. 당시 실제 AWS 상태를 조회한 `docker-bootstrap.tfplan`은 EC2 한 대 교체로 추가 1개·변경 0개·삭제 1개였습니다. EIP·네트워크 인터페이스·EIP 연결·VPC 유지와 설치 스크립트 원문 전달을 계획에서 확인했습니다. 이후 사용자가 전체 삭제 후 새로 생성해 Docker 설치와 EC2 내부 API 정상 응답을 확인했습니다.

Nginx HTTP 규칙 추가 후 Terraform 형식·문법 검증을 통과했습니다. 실제 AWS 조회 계획은 추가 13개·변경 0개·삭제 0개이며, 사용자가 인프라를 전체 삭제한 상태임을 확인했습니다. 이번 HTTP 설정의 `apply`와 외부 API 접속은 아직 수행하지 않았습니다.

2026-11-17에 EIP 조회 방식 전환 후 형식·문법 검사와 실제 AWS 조회 계획을 통과했습니다. 검토용 `eip-reference.tfplan`을 생성해 계획 JSON에서 `aws_eip.app`의 작업이 `forget`인 것을 확인했습니다. 이는 EIP를 삭제하지 않고 관리 목록에서 제외한다는 뜻입니다. 나머지 리소스는 변경이 없었고, EIP 연결과 `public_ip` 출력도 유지됐습니다. 로컬 `terraform.tfvars`에는 기존 상태의 EIP 할당 ID를 반영했습니다. `apply`, 전체 삭제·재생성과 DNS 연결은 실행하지 않았습니다. 계획 파일과 로컬 설정은 Git에서 제외됩니다.

## 공식 문서

- [AWS Provider 설정](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [기존 EC2 키 페어 조회](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/key_pair)
- [Canonical Ubuntu 이미지 확인](https://documentation.ubuntu.com/aws/aws-how-to/instances/find-ubuntu-images/)
- [Terraform plan](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Docker Ubuntu 설치](https://docs.docker.com/engine/install/ubuntu/)
- [Docker 일반 사용자 실행 설정](https://docs.docker.com/engine/install/linux-postinstall/)
- [EC2 user data 실행](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html)
