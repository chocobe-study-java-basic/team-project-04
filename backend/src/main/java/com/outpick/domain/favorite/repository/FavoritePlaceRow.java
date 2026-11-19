package com.outpick.domain.favorite.repository;

import com.outpick.domain.place.entity.PlacePublishStatus;

import java.math.BigDecimal;

public record FavoritePlaceRow(Long id, String name, String address, BigDecimal latitude, BigDecimal longitude,
                               boolean isNotified, PlacePublishStatus publishStatus) {
}
