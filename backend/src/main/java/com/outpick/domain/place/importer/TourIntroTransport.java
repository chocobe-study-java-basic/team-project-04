package com.outpick.domain.place.importer;

@FunctionalInterface
public interface TourIntroTransport {
    String fetchIntro(String contentId);
}
