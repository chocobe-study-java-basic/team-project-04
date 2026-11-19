# EC2에 초기 장소 데이터 반영하기

새 DB를 만들었거나 초기 장소 데이터가 없는 EC2에서 사용한다. 배포 디렉터리의 `.env`로 장소를 수집하고, 기존 초기 검수 SQL로 공개한 뒤 저장 결과를 조회한다. 앱을 다시 배포할 때마다 실행할 필요는 없다.

## 1. 실행 환경 확인하기

EC2에서 MySQL과 최신 Backend가 정상 실행 중이어야 한다. Backend 이미지에는 `TourApiImportCommand`가 포함되어 있어야 한다. 기존 배포·HTTPS 구성은 먼저 완료한다.

EC2의 `~/outpick/.env`에 기존 DB 설정과 `TOUR_API_KEY`가 있는지 편집기로 확인한다. TourAPI의 일반 인증키(Decoding)를 사용한다. 키를 화면에 출력하거나 `.env`를 Git에 올리지 않는다.

수집 프로그램은 EC2에 내려받은 Backend 이미지를 사용한다. EC2에 Java, Gradle, Node.js, Make를 추가 설치할 필요는 없다.

## 2. 필요한 파일 업로드하기

로컬 프로젝트 루트에서 실행한다. 아래 예시는 현재 EIP와 개인키 경로를 사용한다.

```bash
ssh -i /Users/apple/Desktop/auth-keys/aws-auth-keys/04-team-project/devcos-team05--ec2-keypair.pem \
  ubuntu@54.116.156.207 'mkdir -p ~/outpick/scripts ~/outpick/backend/scripts'

scp -i /Users/apple/Desktop/auth-keys/aws-auth-keys/04-team-project/devcos-team05--ec2-keypair.pem \
  compose.places.yaml ubuntu@54.116.156.207:~/outpick/

scp -i /Users/apple/Desktop/auth-keys/aws-auth-keys/04-team-project/devcos-team05--ec2-keypair.pem \
  scripts/init-places.sh ubuntu@54.116.156.207:~/outpick/scripts/

scp -i /Users/apple/Desktop/auth-keys/aws-auth-keys/04-team-project/devcos-team05--ec2-keypair.pem \
  backend/scripts/review-initial-tour-places.sql ubuntu@54.116.156.207:~/outpick/backend/scripts/
```

`ssh` 명령은 서버에 필요한 디렉터리를 만든다. `scp` 명령은 파일을 복사한다. 각 원격 경로의 `:`를 포함해 입력한다. 개인키 파일명이나 EIP가 다르면 현재 값으로 변경한다.

업로드 후 서버에는 다음 파일이 있어야 한다. `.env`와 `compose.deploy.yaml`은 기존 배포 파일을 그대로 사용한다.

```text
~/outpick/
├── .env
├── compose.deploy.yaml
├── compose.places.yaml
├── scripts/
│   └── init-places.sh
└── backend/scripts/
    └── review-initial-tour-places.sql
```

## 3. 초기 데이터 반영하기

EC2에 SSH로 접속한 터미널에서 실행한다.

```bash
cd ~/outpick
bash scripts/init-places.sh
```

스크립트는 다음 순서로 처리한다.

1. DB에 접속해 `db_connection_ok` 값이 `1`인지 확인한다.
2. `.env`의 키를 임시 Backend 컨테이너에 전달해 초기 5곳을 수집한다.
3. `review-initial-tour-places.sql`로 조건에 맞는 초기 장소만 공개한다.
4. 수집한 장소와 공개 상태를 조회한다.

수집 로그의 `CREATED`는 신규 저장, `SKIPPED`는 이미 수집한 장소, `FAILED`는 수집 실패를 뜻한다. `published_this_run`은 이번 실행에서 공개한 장소 수다. 이미 공개한 장소만 있다면 `0`이어도 정상이다.

기존 장소는 삭제하지 않는다. 이미 수집한 장소는 덮어쓰지 않고, 이미 공개했거나 검수 SQL의 예상 값과 다른 장소는 공개 처리에서 건너뛴다. 이 SQL은 초기 5곳에 대해 기록된 검수 내용을 적용한다. 실행 당일에 시설을 새로 검수했다는 의미는 아니다. [초기 장소 검수 범위](tour-api-import.md#2026-11-16-로컬-초기-공개)를 확인한다.

중간 명령이 실패하면 이후 단계는 중단한다. 앞 단계에서 저장한 데이터는 유지된다. 오류 원인을 해결한 뒤 같은 명령을 다시 실행한다. 공개되지 않은 장소를 강제로 일괄 공개하지 않는다.

수집 시 `compose.deploy.yaml`에 `compose.places.yaml`을 합쳐 실행한다. `run --rm --no-deps`는 기존 서비스에 영향을 주지 않고 일회성 컨테이너를 실행한 뒤 삭제한다. `-T`는 대화형 터미널을 만들지 않는 옵션이다. 기존 HTTPS 컨테이너를 변경하지 않으므로 `compose.https.yaml`은 이 스크립트에서 사용하지 않는다.

## 4. 브라우저에서 확인하기

최종 조회에서 `publish_status`를 확인한다. `0`은 공개 전 상태, `1`은 공개 상태다. 조건에 맞지 않는 장소는 `0`으로 남을 수 있다.

`https://outpick.chocobe.shop`에서 장소 목록을 새로 조회한다. 공개된 장소가 목록에 표시되는지 확인한다. 필터가 적용되어 있다면 해제하고 확인한다. 이 명령은 후속 필터·이미지 SQL을 실행하지 않는다.
