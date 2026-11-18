package com.outpick.domain.place.importer;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

public class TourApiClient {
    private final TourApiTransport transport;
    private final JsonMapper mapper = JsonMapper.builder().build();

    public TourApiClient(TourApiTransport transport) { this.transport = transport; }

    public TourApiPlace getPlace(String contentId) {
        String raw = transport.fetchCommon(contentId);
        try {
            var response = mapper.readTree(raw).path("response");
            String code = response.path("header").path("resultCode").asString("");
            if (!"0000".equals(code) && !"00".equals(code)) throw invalid();
            var item = response.path("body").path("items").path("item");
            if (item.isArray()) {
                if (item.size() != 1) throw invalid();
                item = item.path(0);
            }
            if (!item.isObject() || !contentId.equals(text(item, "contentid"))) throw invalid();
            return new TourApiPlace(text(item, "contentid"), text(item, "contenttypeid"), text(item, "title"),
                    text(item, "addr1"), text(item, "addr2"), text(item, "mapx"), text(item, "mapy"),
                    text(item, "homepage"), text(item, "overview"), text(item, "modifiedtime"),
                    text(item, "lDongRegnCd"), text(item, "lDongSignguCd"), text(item, "cpyrhtDivCd"));
        } catch (Exception exception) {
            throw invalid();
        }
    }

    private String text(JsonNode node, String key) { return node.path(key).asString("").trim(); }
    private TourApiException invalid() { return new TourApiException(TourApiException.Reason.INVALID_RESPONSE); }
}
