# OUTPICK HTTPS 실행과 인증서 재사용

결과물은 `https://outpick.chocobe.shop`으로 접속하는 화면·API와 HTTP → HTTPS 자동 이동입니다. EC2를 재생성하면 기존 인증서를 복원해서 사용합니다. DNS는 기존 EIP를 계속 가리켜야 합니다.

인증서는 서버가 해당 도메인의 서버임을 증명하는 파일입니다. Let's Encrypt가 무료로 발급하고 Certbot이 발급·갱신을 요청합니다. 이번에는 도메인 소유 확인용 파일을 Nginx의 HTTP 80번으로 제공하는 webroot 방식을 사용합니다.

## 1. Mac에서 HTTPS 포트 허용하기

프로젝트 루트에서 실행합니다.

```bash
terraform -chdir=infra plan
```

보안 그룹의 TCP 443번 허용 추가만 있어야 합니다. EC2 교체나 삭제가 있으면 적용을 멈추고 확인합니다. 계획 확인 후 다음 명령으로 다시 계획을 검토하고 승인합니다.

```bash
terraform -chdir=infra apply
```

기존 80번은 도메인 소유 확인·갱신과 HTTPS 이동에 계속 사용합니다. 새로운 AWS 리소스는 만들지 않습니다.

## 2. Mac에서 파일 업로드하기

개인 키 경로와 EIP를 실제 값으로 지정합니다. 아래 변수는 같은 터미널에서 이어서 사용합니다.

```bash
SSH_KEY='/개인키/절대경로/devcos-team05--ec2-keypair.pem'
EC2_IP='54.116.156.207'
ssh -i "$SSH_KEY" "ubuntu@$EC2_IP" 'mkdir -p ~/outpick/nginx ~/outpick/scripts ~/outpick/infra/systemd'
scp -i "$SSH_KEY" compose.deploy.yaml compose.https.yaml "ubuntu@$EC2_IP:~/outpick/"
scp -i "$SSH_KEY" nginx/default.conf nginx/https.conf "ubuntu@$EC2_IP:~/outpick/nginx/"
scp -i "$SSH_KEY" scripts/renew-certificates.sh scripts/certificate-storage.sh "ubuntu@$EC2_IP:~/outpick/scripts/"
scp -i "$SSH_KEY" infra/systemd/outpick-certbot-renew.service infra/systemd/outpick-certbot-renew.timer "ubuntu@$EC2_IP:~/outpick/infra/systemd/"
```

`.env`는 기존 서버 파일을 사용합니다. 새 EC2라면 이전 배포와 같이 `~/outpick/.env`를 작성하고 `chmod 600 ~/outpick/.env`를 실행합니다. Docker 설치 완료도 확인합니다. 앱 이미지 재빌드는 필요하지 않습니다.

## 3. EC2에서 최초 인증서 발급하기

아래는 SSH로 접속한 EC2 터미널에서 실행합니다. 이미 백업이 있다면 발급 대신 7번 복원을 진행합니다.

```bash
cd ~/outpick
docker compose -f compose.deploy.yaml config --quiet
docker compose -f compose.deploy.yaml pull
docker compose -f compose.deploy.yaml up -d --wait
docker compose -f compose.deploy.yaml exec -T nginx nginx -t
docker compose -f compose.deploy.yaml exec -T nginx nginx -s reload
```

아직 HTTP만 실행합니다. `certbot`은 도구용 프로필이라 일반 `up`에는 실행되지 않습니다. 인증서가 없는 상태에서 `compose.https.yaml`을 추가하면 Nginx가 인증서 파일을 찾지 못해 실행에 실패합니다.

도메인이 이 서버를 가리키고, 외부에서 `http://outpick.chocobe.shop`에 접속되는지 확인합니다. 다른 서버를 가리키는 AAAA 레코드가 있다면 발급 전에 DNS 설정도 확인합니다.

먼저 테스트 발급을 실행합니다. `YOUR_EMAIL`은 본인의 이메일로 바꿉니다. `--agree-tos`는 Let's Encrypt 이용약관에 동의하는 옵션입니다.

```bash
docker compose -f compose.deploy.yaml run --rm --no-deps certbot certonly \
  --webroot --webroot-path /var/www/certbot \
  --cert-name outpick.chocobe.shop -d outpick.chocobe.shop \
  --email YOUR_EMAIL --agree-tos --non-interactive --dry-run
```

`--webroot`는 실행 중인 Nginx를 통해 소유를 확인하고 `certonly`는 인증서만 발급하며 Nginx 설정은 수정하지 않습니다. `--dry-run`은 테스트 발급 환경을 사용하고 인증서를 저장하지 않습니다. 실패하면 DNS·80번 접속·Nginx 로그를 확인하고 실제 발급은 실행하지 않습니다.

테스트 성공 후 `--dry-run`을 빼고 실제 인증서를 한 번 발급합니다.

```bash
docker compose -f compose.deploy.yaml run --rm --no-deps certbot certonly \
  --webroot --webroot-path /var/www/certbot \
  --cert-name outpick.chocobe.shop -d outpick.chocobe.shop \
  --email YOUR_EMAIL --agree-tos --non-interactive
```

인증서 저장 경로와 만료일을 확인합니다. `letsencrypt` 볼륨에는 인증서·개인 키·계정·갱신 설정을 저장하고, `certbot-webroot` 볼륨에는 소유 확인 파일을 저장합니다. Nginx는 두 볼륨을 읽기 전용으로 연결합니다. Certbot 컨테이너가 종료돼도 볼륨은 유지됩니다.

## 4. EC2에서 HTTPS 실행하기

```bash
docker compose -f compose.deploy.yaml -f compose.https.yaml config --quiet
docker compose -f compose.deploy.yaml -f compose.https.yaml run --rm --no-deps nginx nginx -t
docker compose -f compose.deploy.yaml -f compose.https.yaml up -d --wait
```

두 번째 `-f`는 기본 Compose에 HTTPS 설정을 합칩니다. 80번을 유지하면서 443번과 `nginx/https.conf`를 적용합니다. 이후 배포·종료에도 두 파일을 함께 지정합니다. 기본 파일만으로 다시 `up`하면 HTTP 구성으로 돌아갑니다. `down --volumes`는 DB와 인증서 볼륨을 삭제하므로 사용하지 않습니다.

Mac 브라우저에서 `https://outpick.chocobe.shop`과 `https://outpick.chocobe.shop/api/v1/examples/1`을 엽니다. 인증서 경고 없이 화면과 JSON 응답이 나와야 합니다. Mac 터미널에서도 확인할 수 있습니다.

```bash
curl -I http://outpick.chocobe.shop/main-example/
curl --fail -i -w '\n' https://outpick.chocobe.shop/api/v1/examples/1
```

첫 응답은 `308`과 HTTPS `Location` 헤더, 두 번째는 `200`과 JSON이어야 합니다. `-I`는 본문 없이 응답 헤더를 확인합니다. 인증서 검증을 생략하는 `-k`는 사용하지 않습니다. 소유 확인용 `/.well-known/acme-challenge/` 경로는 갱신을 위해 HTTP를 유지합니다.

카카오 JavaScript SDK 허용 도메인에는 `https://outpick.chocobe.shop`을 등록합니다. IP로 HTTPS에 접속하면 도메인이 인증서와 다르므로 서비스 확인은 도메인으로 진행합니다.

## 5. EC2에서 자동 갱신 등록하기

먼저 갱신 테스트를 실행합니다. 이 스크립트는 Ubuntu의 `flock` 명령으로 다른 갱신·백업 작업과 겹치지 않게 합니다.

```bash
cd ~/outpick
bash scripts/renew-certificates.sh --dry-run
```

테스트가 성공하면 EC2의 예약 실행 도구인 systemd에 다음 파일을 등록합니다.

```bash
sudo install -m 644 infra/systemd/outpick-certbot-renew.service /etc/systemd/system/
sudo install -m 644 infra/systemd/outpick-certbot-renew.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now outpick-certbot-renew.timer
systemctl list-timers outpick-certbot-renew.timer
```

타이머는 하루 두 번 최대 한 시간의 지연을 두고 갱신 필요 여부를 확인합니다. 매번 새 인증서를 발급하는 것은 아닙니다. 갱신 명령 성공 후 Nginx 설정을 검사하고 재로드해 새 인증서를 적용합니다. 실패하면 스크립트가 중단되고 systemd 로그에 남습니다.

```bash
sudo systemctl start outpick-certbot-renew.service
sudo journalctl -u outpick-certbot-renew.service --no-pager -n 50
```

`renew`의 성공 또는 아직 갱신 시점이 아니라는 안내와 Nginx 설정 검사 성공을 확인합니다. 서버 재생성 시 타이머도 다시 등록합니다. Docker 컨테이너 자체에는 예약 갱신이 내장되어 있지 않습니다.

## 6. 인증서를 Mac에 백업하기

최초 발급·갱신 이후와 `terraform destroy` 전에 최신 백업을 보관합니다. 갱신은 자동이지만 Mac으로 백업하는 단계는 수동입니다. EC2가 삭제되면 인증서 볼륨도 사라집니다.

EC2에서 날짜를 포함한 새 파일명으로 백업합니다.

```bash
cd ~/outpick
bash scripts/certificate-storage.sh backup "$HOME/letsencrypt-backup-20261117.tar.gz"
```

다른 날짜에는 파일명도 바꿉니다. 스크립트는 기존 백업을 덮어쓰지 않으며, 갱신과 같은 잠금을 사용합니다. 심볼릭 링크인 `live/`만 복사하지 않고 `/etc/letsencrypt` 전체를 보관합니다. 백업 파일은 소유자만 읽고 쓸 수 있는 권한 `600`으로 생성합니다.

Mac에서 앞서 설정한 `SSH_KEY`, `EC2_IP` 변수로 다운로드합니다. 이미 같은 파일명이 있다면 새로운 이름을 사용합니다.

```bash
umask 077
mkdir -p /Users/apple/Desktop/auth-keys/aws-auth-keys/04-team-project/tls
chmod 700 /Users/apple/Desktop/auth-keys/aws-auth-keys/04-team-project/tls
scp -i "$SSH_KEY" "ubuntu@$EC2_IP:~/letsencrypt-backup-20261117.tar.gz" /Users/apple/Desktop/auth-keys/aws-auth-keys/04-team-project/tls/
tar -tzf /Users/apple/Desktop/auth-keys/aws-auth-keys/04-team-project/tls/letsencrypt-backup-20261117.tar.gz
```

목록에 `archive/`, `live/`, `accounts/`, `renewal/`이 있는지 확인합니다. `tar -tzf`는 파일 이름만 표시하고 개인 키 내용을 출력하지 않습니다. 이 백업에는 개인 키가 포함되므로 Git·Docker Hub·메신저로 공유하지 않습니다. 로컬 경로에 파일이 존재하고 다운로드가 성공했는지 확인한 후 EC2를 삭제합니다. 백업 유효성은 실제 새 볼륨 복원과 HTTPS 접속으로 최종 확인합니다.

## 7. 새 EC2에 기존 인증서 복원하기

Terraform으로 새 EC2를 생성하고 SSH·Docker를 확인합니다. 2번의 파일 업로드와 `.env` 작성을 다시 진행합니다. 새 서버에 HTTP 기본 Compose를 실행한 뒤 Mac에서 보관한 백업을 업로드합니다.

```bash
scp -i "$SSH_KEY" /Users/apple/Desktop/auth-keys/aws-auth-keys/04-team-project/tls/letsencrypt-backup-20261117.tar.gz "ubuntu@$EC2_IP:~/"
```

새 EC2에서 실행합니다. 자신이 생성한 신뢰할 수 있는 백업만 복원합니다.

```bash
cd ~/outpick
docker compose -f compose.deploy.yaml up -d --wait
bash scripts/certificate-storage.sh restore "$HOME/letsencrypt-backup-20261117.tar.gz"
docker compose -f compose.deploy.yaml run --rm --no-deps certbot certificates
```

비어 있는 인증서 볼륨에만 복원합니다. 도메인과 만료일을 확인하고, 백업이 오래됐다면 HTTP가 동작하는 상태에서 갱신 필요 여부를 확인합니다.

```bash
docker compose -f compose.deploy.yaml run --rm --no-deps certbot renew --cert-name outpick.chocobe.shop --non-interactive
```

아직 유효한 인증서는 계속 사용합니다. 만료됐거나 갱신 시점이면 발급 환경에 연결하므로 DNS와 80번이 동작해야 합니다. 정상 완료 후 4번 HTTPS 실행과 5번 자동 갱신 등록을 반복합니다. 갱신됐다면 새 백업도 다운로드합니다. 단순 서버 재생성 때문에 `certonly`를 반복하거나 `--force-renewal`을 붙이지 않습니다.

## 구현 검증 결과

2026-11-17에 Compose의 HTTP·HTTPS 설정 병합, Bash 문법, Terraform 형식·문법 검사를 통과했습니다. 실제 AWS 조회 계획은 기존 보안 그룹의 443번 규칙 추가 한 건이며 EC2 교체는 없었습니다. AWS 적용은 실행하지 않았습니다.

별도 임시 컨테이너·볼륨에서 직접 만든 테스트 인증서와 가상 Backend로 HTTP 최초 실행, HTTPS 정적 응답, API 경로·쿼리·HTTPS 전달 헤더, 308 이동과 소유 확인 경로 예외를 검증했습니다. 테스트 인증서는 해당 검사에서만 신뢰하도록 지정했으며 실제 Let's Encrypt 인증서를 발급하지 않았습니다. 백업 파일 권한 600, 개인 키·계정 설정·심볼릭 링크 보존, 기존 파일·볼륨 덮어쓰기 거부와 새 볼륨 복원을 확인했습니다. 검증용 컨테이너·볼륨은 정리했습니다.

갱신 스크립트는 모의 Docker 명령으로 성공 시 재로드, 테스트 갱신 시 재로드 생략, 갱신·설정 검사 실패 시 중단과 잠금 충돌 처리를 확인했습니다. Mac의 검증에서는 Ubuntu의 `flock` 명령을 대체했으므로 실제 프로세스 잠금과 systemd 예약 실행은 EC2에서 확인해야 합니다. 실제 인증서 최초 발급·갱신 테스트·공인 HTTPS 접속·Mac 백업 다운로드는 아직 실행하지 않았습니다.

## 참고 문서

- [Certbot webroot 발급과 갱신](https://eff-certbot.readthedocs.io/en/stable/using.html)
- [Let's Encrypt HTTP-01 확인 방식](https://letsencrypt.org/docs/challenge-types/)
- [Let's Encrypt 발급 제한](https://letsencrypt.org/docs/rate-limits/)
