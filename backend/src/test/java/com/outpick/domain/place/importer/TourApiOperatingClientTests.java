package com.outpick.domain.place.importer;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import java.util.List;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;

class TourApiOperatingClientTests {
    private String response(Map<String, String> item, boolean array) {
        return JsonMapper.builder().build().writeValueAsString(Map.of("response", Map.of("header", Map.of("resultCode", "0000"),
                "body", Map.of("items", Map.of("item", array ? List.of(item) : item)))));
    }

    @Test void readsBothItemShapesAndConvertsHtmlToText() {
        for (boolean array : List.of(true, false)) {
            var item = Map.of("contentid", "1", "contenttypeid", "28", "usetimeleports", "평일 10:00<br>주말 09:00",
                    "restdateleports", "월요일", "infocenterleports", "1855-3946");
            var data = new TourApiOperatingClient(id -> response(item, array)).getOperatingInfo("1");
            assertThat(data.operatingHours()).isEqualTo("평일 10:00\n주말 09:00");
            assertThat(data.restDays()).isEqualTo("월요일");
            assertThat(data.contactPhone()).isEqualTo("1855-3946");
        }
    }

    @Test void keepsAbsentFieldsNullInsteadOfInventingYearRoundOperation() {
        var data = new TourApiOperatingClient(id -> response(Map.of("contentid", "1", "contenttypeid", "28",
                "infocenterleports", "1855-3946"), true)).getOperatingInfo("1");
        assertThat(data.operatingHours()).isNull();
        assertThat(data.restDays()).isNull();
    }

    @Test void rejectsEmptyWrongFacilityAndWrongTypeWithoutLeakingResponse() {
        for (var item : List.of(Map.of("contentid", "1", "contenttypeid", "28"),
                Map.of("contentid", "2", "contenttypeid", "28", "infocenterleports", "secret"),
                Map.of("contentid", "1", "contenttypeid", "32", "infocenterleports", "secret"))) {
            assertThatThrownBy(() -> new TourApiOperatingClient(id -> response(item, true)).getOperatingInfo("1"))
                    .isInstanceOf(TourApiException.class).hasNoCause().hasMessageNotContaining("secret");
        }
    }

    @Test void rejectsProviderErrorAndOversizedField() {
        assertThatThrownBy(() -> new TourApiOperatingClient(id -> "<xml>secret</xml>").getOperatingInfo("1"))
                .isInstanceOf(TourApiException.class).hasNoCause().hasMessageNotContaining("secret");
        assertThatThrownBy(() -> new TourApiOperatingClient(id -> response(Map.of("contentid", "1", "contenttypeid", "28",
                "infocenterleports", "1".repeat(101)), true)).getOperatingInfo("1"))
                .isInstanceOf(TourApiException.class);
    }
}
