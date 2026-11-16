package com.outpick.domain.place.importer;

import java.util.ArrayList;
import java.util.List;

/** HTTP는 트랜잭션 밖에서, 장소별 저장은 Writer의 독립 트랜잭션에서 수행한다. */
public class TourApiImportService {
    private final TourApiClient client;
    private final TourApiNormalizer normalizer;
    private final TourImportWriter writer;

    public TourApiImportService(TourApiClient client, TourApiNormalizer normalizer, TourImportWriter writer) {
        this.client = client;
        this.normalizer = normalizer;
        this.writer = writer;
    }

    public List<TourImportResult> importPlaces(List<TourImportTarget> targets) {
        var results = new ArrayList<TourImportResult>();
        for (var target : targets) {
            try {
                if (Thread.currentThread().isInterrupted()) {
                    results.add(failed(target, "INTERRUPTED"));
                    continue;
                }
                Long existing = writer.findExistingPlaceId(target.contentId());
                if (existing != null) {
                    results.add(new TourImportResult(target.contentId(), TourImportResult.Status.SKIPPED, existing, null));
                    continue;
                }
                var candidate = normalizer.normalize(target, client.getPlace(target.contentId()));
                results.add(writer.save(candidate));
            } catch (TourApiException exception) {
                results.add(failed(target, exception.getReason().name()));
            } catch (RuntimeException exception) {
                // 원본 예외/응답은 출력하지 않는다. 한 장소의 실패는 다음 장소와 격리한다.
                results.add(failed(target, "SAVE_FAILED"));
            }
        }
        return List.copyOf(results);
    }

    private TourImportResult failed(TourImportTarget target, String reason) {
        return new TourImportResult(target.contentId(), TourImportResult.Status.FAILED, null, reason);
    }
}
