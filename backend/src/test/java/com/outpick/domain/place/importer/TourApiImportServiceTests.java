package com.outpick.domain.place.importer;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class TourApiImportServiceTests {
    @Test
    @DisplayName("기존 장소는 건너뛰고 응답 실패 후에도 다음 장소를 수집한다")
    void skipsExistingWithoutHttpAndContinuesAfterBadResponse() {
        var writer = mock(TourImportWriter.class);
        when(writer.findExistingPlaceId(anyString())).thenReturn(null);
        when(writer.findExistingPlaceId("1")).thenReturn(10L);
        var candidate = new TourApiNormalizer().normalize(TourApiTests.target("3"), TourApiTests.place("3", "126.1", ""));
        when(writer.save(any())).thenReturn(new TourImportResult("3", TourImportResult.Status.CREATED, 30L, null));
        var client = mock(TourApiClient.class);
        when(client.getPlace("2")).thenThrow(new TourApiException(TourApiException.Reason.INVALID_RESPONSE));
        when(client.getPlace("3")).thenReturn(TourApiTests.place("3", "126.1", ""));
        var results = new TourApiImportService(client, new TourApiNormalizer(), writer).importPlaces(
                List.of(TourApiTests.target("1"), TourApiTests.target("2"), TourApiTests.target("3")));
        assertThat(results).extracting(TourImportResult::status).containsExactly(
                TourImportResult.Status.SKIPPED, TourImportResult.Status.FAILED, TourImportResult.Status.CREATED);
        verify(client, never()).getPlace("1");
        verify(writer).save(candidate);
    }

    @Test
    @DisplayName("저장 실패를 격리하고 내부 예외를 노출하지 않는다")
    void isolatesSaveFailureAndReportsSafeReason() {
        var writer = mock(TourImportWriter.class);
        when(writer.findExistingPlaceId(anyString())).thenReturn(null);
        when(writer.save(any())).thenThrow(new IllegalStateException("sensitive"));
        var client = mock(TourApiClient.class);
        when(client.getPlace("1")).thenReturn(TourApiTests.place("1", "126.1", ""));
        var results = new TourApiImportService(client, new TourApiNormalizer(), writer).importPlaces(List.of(TourApiTests.target("1")));
        assertThat(results.getFirst().reason()).isEqualTo("SAVE_FAILED");
    }
}
