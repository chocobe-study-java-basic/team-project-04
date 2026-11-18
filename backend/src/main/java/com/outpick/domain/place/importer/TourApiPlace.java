package com.outpick.domain.place.importer;

public record TourApiPlace(String contentId, String contentTypeId, String title, String address, String addressDetail,
                           String longitude, String latitude, String homepage, String overview, String modifiedAt,
                           String regionCode, String districtCode, String imageCopyrightCode) {
}
