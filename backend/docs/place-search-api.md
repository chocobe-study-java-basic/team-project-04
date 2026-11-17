# 공개 장소 검색 API

## 구현한 계약

`GET /api/v1/places`는 인증 없이 `publish_status=1(PUBLISHED)`인 장소만 반환한다. DRAFT·HIDDEN은 목록과 결과 수에서 모두 제외한다. 성공 DTO에 `data` 래퍼를 추가하지 않는다.

기존 명세의 장소 목록, 페이지 정보, 동일한 장소별 종목에서 필터를 만족해야 하는 규칙을 따른다. 아래 기본값·허용 범위·정렬 키·지도 파라미터명·지역 하위 포함 범위는 이번 구현에서 구체화한 선택이며 프론트 연결 전에 팀과 공유한다.

## 쿼리 파라미터

- `query`: 장소 이름 또는 별칭의 부분 일치. 앞뒤 공백 제거, 빈 문자열은 조건 없음, 최대 100자. `%`, `_`, `\`도 와일드카드 대신 문자 그대로 검색한다. 대소문자·문자 정렬은 MySQL 컬럼의 collation을 따른다.
- `regionId`: 양수. 해당 지역과 바로 아래 하위 지역의 장소를 조회한다. 현재 시·도 / 시·군·구 두 단계 탐색을 지원하며 손자 이하 지역을 재귀 탐색하지 않는다.
- `activityTypeIds`: 양수 종목 ID 목록, 최대 50개. `activityTypeIds=1&activityTypeIds=2`처럼 전달한다. 선택 종목 중 하나가 맞으면 된다.
- `season`, `environmentType`: 최대 10자. 앞뒤 공백을 제거하고 저장된 코드와 일치하는 값을 찾는다. 코드 목록은 아직 확정하지 않았으므로 특정 enum이나 카테고리 이름으로 자동 변환하지 않는다. 정의되지 않은 문자열은 일치 데이터가 없으면 빈 결과가 된다.
- `south`, `west`, `north`, `east`: 모두 생략하거나 네 값을 모두 입력한다. 위도는 -90~90, 경도는 -180~180. `south <= north`, `west <= east`여야 한다. 경계 위의 장소를 포함하며, 지도 범위 조회 시 좌표 NULL인 장소는 제외한다. 날짜 변경선을 가로지르는 범위는 지원하지 않는다.
- `page`: 0부터 시작, 기본 0, 최대 1,000,000. 과도한 오프셋과 정수 범위 초과를 제한한다.
- `size`: 기본 20, 1~50.
- `sort`: `name`(기본, 이름 오름차순) 또는 `name-desc`(이름 내림차순). 이름이 같으면 두 정렬 모두 장소 ID 오름차순을 적용한다. 데이터가 변경되지 않는 동안 페이지 간 순서가 일정하다. NULL 이름의 위치는 MySQL 정렬 규칙을 따른다.

서로 다른 필터 종류는 AND, 여러 종목 ID는 OR로 조합한다. 종목·시즌·실내외는 반드시 동일한 `place_activity`에 대해 만족해야 한다. 예를 들어 여름 실외 서핑과 겨울 실내 클라이밍을 제공하는 장소라도 '서핑 + 겨울 + 실내'에는 반환하지 않는다.

## 요청과 응답 예시

아래 ID와 장소는 설명용이며 실제 DB에 자동으로 적재하지 않는다.

```http
GET /api/v1/places?activityTypeIds=1&season=WINTER&environmentType=OUTDOOR&south=37&west=127&north=39&east=130&page=0&size=20&sort=name
```

```json
{
  "items": [
    {
      "id": 1,
      "name": "예시 장소",
      "address": "확인된 주소",
      "latitude": 37.37,
      "longitude": 128.39
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1
}
```

`items`의 이름·주소·좌표는 현재 저장 모델이 허용하는 NULL이 나올 수 있다. 공개 적합성 검수는 등록/공개 서비스에서 후속 구현한다. 아직 확보하지 않은 대표 사진이나 종목 표시용 필드를 임의로 추가하지 않았다.

일치하는 장소가 없거나 마지막 페이지 이후를 조회해도 `200`과 빈 `items`를 반환한다. `totalElements`는 해당 조건의 전체 장소 수이며 빈 페이지에서도 유지한다. 입력 제약 위반은 공통 `400 application/problem+json`, `VALIDATION_FAILED`, `fieldErrors`, `requestId`로 응답한다. 변환 불가능한 숫자 등 바인딩 오류도 공통 400 응답이다.

## 조회와 검증

Criteria API의 DTO projection으로 목록에 필요한 필드만 읽는다. 활동·시즌은 EXISTS 서브쿼리로 확인해 다중 활동이 같은 장소를 중복 생성하지 않게 한다. 결과 조회와 동일 조건의 count 조회를 각각 실행하며 연관 엔티티를 직렬화하지 않는다.

MySQL Testcontainers 통합 테스트는 공개 상태 제한, 필터 조합, 서로 다른 종목 조건의 혼합 방지, 다중 활동의 중복 방지, 지역·지도 경계, 검색어 escape, 이름 정렬·동률·페이지 이동, 빈 결과, 입력 검증과 공통 오류 응답을 검사한다.

```bash
./gradlew test --tests com.outpick.domain.place.PlaceSearchApiTests
./gradlew build
```

후속 상세 API는 [상세 API 문서](place-detail-api.md), 카테고리·지역 이름을 실제 ID로 변환하는 프론트 연동과 현재 페이지의 지도 표시 정책은 [연결 문서](place-integration.md)를 참고한다. 실제 데이터 규모의 실행 계획·부하 테스트는 아직 수행하지 않았다.
