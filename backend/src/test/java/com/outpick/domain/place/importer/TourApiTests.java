package com.outpick.domain.place.importer;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class TourApiTests {
    static TourImportTarget target(String id) {
        return new TourImportTarget(id, "테스트 시설", "수상", List.of("서핑"));
    }

    static TourApiPlace place(String id, String longitude, String homepage) {
        return new TourApiPlace(id, "28", "테스트 시설", "경기도 시흥시 거북섬둘레길 42", "",
                longitude, "37.324098906498", homepage, "<p>시설 &amp; 안내</p><br>검수 전",
                "20261113090000", "41", "390", "Type3");
    }

    static String response(String id, boolean array) {
        var item = Map.of("contentid", id, "contenttypeid", "28", "title", "테스트 시설");
        return JsonMapper.builder().build().writeValueAsString(Map.of("response", Map.of(
                "header", Map.of("resultCode", "0000"), "body", Map.of("items", Map.of("item", array ? List.of(item) : item)))));
    }

    @Test void acceptsObjectAndArrayAndChecksContentId() {
        for (boolean array : List.of(true, false)) {
            var client = new TourApiClient(id -> response(id, array));
            assertThat(client.getPlace("1").title()).isEqualTo("테스트 시설");
        }
        assertThatThrownBy(() -> new TourApiClient(id -> response("2", true)).getPlace("1"))
                .isInstanceOf(TourApiException.class).hasNoCause();
    }

    @ParameterizedTest
    @ValueSource(strings = {"<xml>serviceKey=secret</xml>", "not json", "{\"response\":{\"header\":{\"resultCode\":\"30\",\"resultMsg\":\"secret\"}}}",
            "{\"response\":{\"header\":{\"resultCode\":\"0000\"},\"body\":{\"items\":\"\"}}}"})
    void rejectsInvalidAndProviderErrorWithoutLeakingBody(String raw) {
        assertThatThrownBy(() -> new TourApiClient(id -> raw).getPlace("1"))
                .isInstanceOf(TourApiException.class).hasNoCause().hasMessageNotContaining("secret");
    }

    @Test void normalizesCoordinatesHtmlAndLeavesVerificationSeparate() {
        var normalizer = new TourApiNormalizer();
        var result = normalizer.normalize(target("1"), place("1", "126.680685089403", "<a href='https://example.com/a?a=1&amp;b=2'>홈</a>"));
        assertThat(result.latitude()).isEqualByComparingTo("37.3240989");
        assertThat(result.longitude()).isEqualByComparingTo("126.6806851");
        assertThat(result.description()).contains("시설 & 안내", "검수 전").doesNotContain("<", ">", "&amp;");
        assertThat(result.homepage()).isEqualTo("https://example.com/a?a=1&b=2");
        assertThat(result.regionCode()).isEqualTo("KR-41");
        assertThat(result.districtCode()).isEqualTo("KR-41390");
        assertThat(result.originUpdatedAt().getYear()).isEqualTo(2026);
    }

    @Test void acceptsRealHomepageFormatsAndRejectsUnsafeSchemes() {
        var normalizer = new TourApiNormalizer();
        assertThat(normalizer.homepage("공식 홈페이지 https://busan.skylineluge.kr/")).isEqualTo("https://busan.skylineluge.kr/");
        assertThat(normalizer.homepage("www.railtrip.co.kr")).isEqualTo("https://www.railtrip.co.kr");
        assertThat(normalizer.homepage("<a href='javascript:alert(1)'>홈</a>")).isNull();
        assertThat(normalizer.homepage("https://user:password@example.com")).isNull();
        assertThat(normalizer.text("<script>alert(1)</script><p>안내</p>")).isEqualTo("안내");
    }

    @ParameterizedTest @ValueSource(strings = {"181", "NaN", "", "1e2", "126.1oops"})
    void rejectsBadCoordinates(String longitude) {
        assertThatThrownBy(() -> new TourApiNormalizer().normalize(target("1"), place("1", longitude, "")))
                .isInstanceOf(TourApiException.class);
    }

    @Test void rejectsUnexpectedFacilityAndDoesNotTruncateLongUrl() {
        var normalizer = new TourApiNormalizer();
        assertThatThrownBy(() -> normalizer.normalize(target("2"), place("1", "126.1", "")))
                .isInstanceOf(TourApiException.class);
        assertThatThrownBy(() -> normalizer.normalize(target("1"), place("1", "126.1", "https://example.com/" + "a".repeat(101))))
                .isInstanceOf(TourApiException.class);
    }
}
