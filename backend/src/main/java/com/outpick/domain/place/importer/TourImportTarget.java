package com.outpick.domain.place.importer;

import java.util.List;

/** 초기 회의 목록에서 조회로 확인한 콘텐츠 ID. 검색 첫 결과를 자동 선택하지 않는다. */
public record TourImportTarget(String contentId, String expectedName, String categoryName, List<String> activityNames) {
    public TourImportTarget { activityNames = List.copyOf(activityNames); }

    public static List<TourImportTarget> initialFive() {
        return List.of(
                new TourImportTarget("2678888", "시흥 웨이브파크", "수상", List.of("서핑")),
                new TourImportTarget("646762", "곤지암리조트 스키장", "스키·보드", List.of("스키", "스노보드")),
                new TourImportTarget("2727468", "스카이라인 루지 부산", "체험", List.of("루지")),
                new TourImportTarget("2396259", "정동진 레일바이크", "체험", List.of("레일바이크")),
                new TourImportTarget("2623831", "플라이스테이션", "항공", List.of("실내 스카이다이빙"))
        );
    }
}
