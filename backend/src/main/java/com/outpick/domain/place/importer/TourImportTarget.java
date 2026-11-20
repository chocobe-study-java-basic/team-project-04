package com.outpick.domain.place.importer;

import java.util.List;

/** TourAPI 목록과 상세를 대조해 선정한 콘텐츠 ID와 검수 전 종목 후보를 관리한다. */
public record TourImportTarget(String contentId, String expectedName, String categoryName, List<String> activityNames) {
    public TourImportTarget { activityNames = List.copyOf(activityNames); }

    public static List<TourImportTarget> initialPlaces() {
        return List.of(
                withActivities("2678888", "시흥 웨이브파크", "수상", "서핑"),
                withActivities("646762", "곤지암리조트 스키장", "스키·보드", "스키", "스노보드"),
                withActivities("2727468", "스카이라인 루지 부산", "체험", "루지"),
                withActivities("2396259", "정동진 레일바이크", "체험", "레일바이크"),
                withActivities("2623831", "플라이스테이션", "항공", "실내 스카이다이빙"),

                // 서울 동부에서 지도 범위를 좁혀도 두 페이지를 확인할 수 있는 후보 22곳입니다.
                unclassified("131139", "강남청소년센터"),
                withActivities("1017568", "강동그린웨이 가족캠핑장", "체험", "캠핑"),
                withActivities("2743751", "뚝섬 윈드서핑장", "수상", "윈드서핑"),
                withActivities("131297", "롯데월드 아이스링크", "실내", "아이스스케이팅"),
                unclassified("3060929", "마천청소년센터"),
                withActivities("131727", "서울레저파크 어린이회관 눈썰매장", "체험", "눈썰매"),
                unclassified("1093200", "서울종합운동장(잠실종합운동장)"),
                withActivities("2674989", "송정제방길", "체험", "산책"),
                unclassified("3074766", "슈터스클럽"),
                unclassified("2758179", "올림픽체조경기장(KSPO DOME)"),
                withActivities("2773297", "워커힐숲길", "체험", "산책"),
                withActivities("3058205", "응봉산 암벽등반공원", "산악", "클라이밍"),
                withActivities("131318", "잠실한강공원 잠실물놀이장", "수상", "물놀이"),
                withActivities("131313", "정립회관 수영센터", "수상", "수영"),
                withActivities("2783315", "청계천 자전거도로", "체험", "자전거"),
                withActivities("1148818", "한강공원 뚝섬 눈썰매장", "체험", "눈썰매"),
                withActivities("3080519", "한강드론공원", "항공", "드론"),
                withActivities("775883", "한강시민공원 뚝섬수영장(실외)", "수상", "수영"),
                withActivities("1964922", "[서울둘레길 5코스] 아차산코스", "산악", "트레킹"),
                withActivities("1964914", "[서울둘레길 6코스] 고덕산코스", "산악", "트레킹"),
                withActivities("1964932", "[서울둘레길 7코스] 일자산코스", "산악", "트레킹"),
                withActivities("1964937", "[서울둘레길 8코스] 장지·탄천코스", "산악", "트레킹"),

                // 서울 중심·동부 지도 범위의 나머지 후보 23곳입니다.
                withActivities("2553819", "경의선숲길", "체험", "산책"),
                unclassified("2647687", "골든블루마리나"),
                withActivities("131519", "그랜드하얏트 서울 아이스링크", "실내", "아이스스케이팅"),
                withActivities("4068707", "남산자락숲길", "체험", "산책"),
                unclassified("2773417", "다이브라이프"),
                withActivities("2753381", "더클라임 클라이밍 양재점", "실내", "클라이밍"),
                withActivities("3060926", "롤퀸롤러장", "실내", "롤러스케이팅"),
                withActivities("767780", "리버시티수상스키장", "수상", "수상스키"),
                unclassified("2733973", "반포종합운동장"),
                withActivities("2406564", "북한산 자락길", "산악", "트레킹"),
                withActivities("131333", "서대문문화체육회관 실내수영장", "수상", "수영"),
                withActivities("1101088", "서울 한양도성 순성길", "체험", "산책"),
                withActivities("663785", "서울광장 스케이트장", "체험", "아이스스케이팅"),
                unclassified("131455", "서울시립수서청소년센터"),
                unclassified("131138", "서울청소년수련관"),
                withActivities("3060932", "에어즈락 클라이밍 위례점", "실내", "클라이밍"),
                unclassified("131122", "올림픽기념국민생활관"),
                withActivities("586753", "용산초등학교 실내수영장", "수상", "수영"),
                unclassified("990140", "장충체육관"),
                unclassified("131624", "종로구민회관"),
                withActivities("131317", "한강시민공원 여의도수영장(실외)", "수상", "수영"),
                withActivities("131315", "한강시민공원 잠원수영장(실외)", "수상", "수영"),
                withActivities("4109623", "한강요트투어 세일링파라다이스", "수상", "요트")
        );
    }

    private static TourImportTarget withActivities(String id, String name, String category, String... activities) {
        return new TourImportTarget(id, name, category, List.of(activities));
    }

    private static TourImportTarget unclassified(String id, String name) {
        return new TourImportTarget(id, name, null, List.of());
    }
}
