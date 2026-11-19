package com.outpick.domain.favorite.dto;

import jakarta.validation.constraints.NotNull;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.annotation.JsonDeserialize;

public record FavoriteNotificationRequest(
        @NotNull(message = "알림 수신 여부를 입력해 주세요.")
        @JsonDeserialize(using = FavoriteNotificationRequest.BooleanDeserializer.class)
        Boolean isNotified
) {
    public static class BooleanDeserializer extends ValueDeserializer<Boolean> {
        @Override
        public Boolean deserialize(JsonParser parser, DeserializationContext context) {
            if (parser.hasToken(JsonToken.VALUE_TRUE) || parser.hasToken(JsonToken.VALUE_FALSE)) {
                return parser.getBooleanValue();
            }
            return context.reportInputMismatch(Boolean.class, "알림 수신 여부는 불리언이어야 합니다.");
        }
    }
}
