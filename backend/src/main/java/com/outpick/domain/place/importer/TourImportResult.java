package com.outpick.domain.place.importer;

public record TourImportResult(String contentId, Status status, Long placeId, String reason) {
    public enum Status { CREATED, SKIPPED, FAILED }
}
