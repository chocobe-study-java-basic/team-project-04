# HTTPS와 인증서 관리

새 EC2의 파일 업로드·인증서 복원 또는 최초 발급·HTTPS 실행·갱신 예약 등록은 [배포 통합 안내](deploy.md)를 처음부터 따른다. 이 문서는 인증서의 역할과 배포 후 관리 작업을 설명한다.

## 인증서를 사용하는 위치

Let's Encrypt에서 발급받은 인증서는 Docker의 `letsencrypt` 볼륨에 저장한다. Nginx가 이 볼륨을 읽기 전용으로 연결하고 `nginx/https.conf`에서 다음 파일을 사용한다.

- `/etc/letsencrypt/live/outpick.chocobe.shop/fullchain.pem`: 서버 인증서와 중간 인증서
- `/etc/letsencrypt/live/outpick.chocobe.shop/privkey.pem`: TLS 개인키

Certbot은 발급·갱신·계정·갱신 설정을 관리한다. `certonly --webroot`는 실행 중인 Nginx의 HTTP 80번 경로를 통해 도메인 소유를 확인하고, Nginx 설정은 직접 수정하지 않는다. HTTPS 설정은 저장소의 `nginx/https.conf`와 `compose.https.yaml`로 관리한다.

HTTP 요청은 HTTPS로 이동하지만 `/.well-known/acme-challenge/`는 도메인 확인과 갱신을 위해 HTTP로 제공한다. DNS는 해당 서버의 EIP를 가리켜야 하며 80·443번 접속이 허용되어 있어야 한다. HTTPS를 확인할 때는 IP가 아닌 인증서의 도메인을 사용한다.

## 최초 발급과 서버 재생성

- 기존 백업이 있으면 [인증서 준비의 5-A](deploy.md#5-a-기존-인증서-복원)로 복원한다. 서버 재생성만을 이유로 재발급하지 않는다.
- 백업이 없다면 [5-B 최초 발급](deploy.md#5-b-백업이-없을-때-최초-발급)을 진행한다. 테스트 발급을 확인한 뒤 실제 발급한다.
- 복원은 비어 있는 인증서 볼륨에만 허용한다. 비어 있지 않다는 오류가 나면 이미 있는 인증서를 확인한다. 파일을 지워 강제로 복원하지 않는다.
- 이미 HTTPS로 운영하는 서버의 앱 업데이트에는 인증서 복원이 필요 없다.

## 자동 갱신 동작과 확인

EC2의 systemd 타이머가 하루 두 번, 최대 한 시간의 지연을 두고 갱신 서비스를 실행한다. 서비스는 `scripts/renew-certificates.sh`를 호출하며, 갱신 시점이면 갱신하고 Nginx 설정 검사 후 재로드한다. 갱신 시점이 아니면 인증서는 유지한다. 실패하면 이후 단계가 중단되고 systemd 로그에 남는다.

예약 설치 명령은 [배포 안내 7번](deploy.md#7-인증서-자동-갱신-등록)에 있다. Docker 컨테이너만 실행해도 예약이 등록되는 것은 아니며 새 EC2에는 다시 등록해야 한다.

배포 후 **EC2 · `~/outpick`**에서 확인한다.

```bash
systemctl list-timers outpick-certbot-renew.timer
sudo journalctl -u outpick-certbot-renew.service --no-pager -n 50
```

`NEXT`는 다음 예약이고, 실행 로그는 실제 작업 결과다. 갱신 시점이 아니어서 건너뛴 결과도 정상이다. 예약 직후에는 아직 예약 실행 기록이 없을 수 있다.

수동으로 실제 갱신 절차를 실행할 때는 다음 명령을 사용한다.

```bash
sudo systemctl start outpick-certbot-renew.service
sudo journalctl -u outpick-certbot-renew.service --no-pager -n 50
```

갱신 과정 자체만 모의 테스트하려면 다음 명령을 사용한다. 실제 인증서 변경이나 Nginx 재로드는 하지 않는다.

```bash
bash scripts/renew-certificates.sh --dry-run
```

Certbot의 내부 지연으로 몇 분 기다릴 수 있다. 테스트 지연을 생략하는 명령은 [배포 안내 7번](deploy.md#7-인증서-자동-갱신-등록)에 있다. 스크립트는 인자 없이 실행하거나 `--dry-run` 하나만 받을 수 있다.

## 백업에 포함되는 것과 보관 시점

`scripts/certificate-storage.sh`는 `/etc/letsencrypt` 전체를 압축한다. 인증서뿐 아니라 개인키, 계정, 갱신 설정과 심볼릭 링크를 함께 보관한다. `live/`의 두 파일만 복사하는 방식은 사용하지 않는다.

최초 발급·실제 갱신 후와 서버 삭제 전에 [배포 안내 9번](deploy.md#9-인증서-백업-보관)의 백업·로컬 다운로드를 진행한다. 자동 갱신은 Mac의 백업까지 갱신하지 않는다.

백업 파일은 권한 `600`으로 생성하며 기존 파일을 덮어쓰지 않는다. 갱신과 백업·복원은 같은 잠금을 사용하므로 동시에 실행하면 후속 작업이 중단된다. 다른 작업이 끝난 뒤 다시 실행한다.

백업에는 개인키가 포함되므로 프로젝트 밖의 개인 인증 파일 디렉터리에 보관한다. Git·이미지 저장소·메신저에 올리지 않는다. 압축 목록 확인은 저장 내용을 확인하는 단계이며, 실제 복원 가능 여부는 새 서버에서 복원과 HTTPS 접속으로 확인한다.

## 오류 확인

- 발급·갱신 실패: 도메인의 A·AAAA 레코드, HTTP 80번 접속, Nginx 로그와 실패 메시지를 확인한다.
- HTTPS 시작 실패: 인증서의 도메인·유효기간과 볼륨 복원 여부를 확인한다. 인증서 파일이 없는 상태에서 HTTPS 설정을 적용하지 않는다.
- 예약 실패: 위의 systemd 로그에서 오류를 확인한다.
- 잠금 충돌: 갱신·백업·복원 중인 작업이 끝난 뒤 다시 실행한다.

`down --volumes`는 DB와 인증서를 지우므로 인증서 오류 해결을 위해 실행하지 않는다.

## 참고 문서

- [Certbot webroot 발급과 갱신](https://eff-certbot.readthedocs.io/en/stable/using.html)
- [Let's Encrypt HTTP-01 확인 방식](https://letsencrypt.org/docs/challenge-types/)
- [Let's Encrypt 발급 제한](https://letsencrypt.org/docs/rate-limits/)
