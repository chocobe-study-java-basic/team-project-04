package com.outpick.domain.place.importer;

@FunctionalInterface
public interface TourApiTransport {
    String fetchCommon(String contentId);
}
