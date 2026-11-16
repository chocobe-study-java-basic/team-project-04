package com.outpick.domain.place.importer;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import org.testcontainers.mysql.MySQLContainer;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@Testcontainers
class TourImportPersistenceTests {
    @Container @ServiceConnection
    static MySQLContainer mysql = new MySQLContainer("mysql:8.4.13");
    @Autowired TourImportWriter writer;
    @Autowired JdbcTemplate jdbc;
    @Autowired TourOperatingInfoWriter operatingWriter;

    @Test void initialOperatingCollectionIsUnverifiedAndNeverOverwritesReviewedValues() {
        var imported = writer.save(candidate("106"));
        assertThat(operatingWriter.saveInitial(new TourOperatingSnapshot("106", "평일 10:00", "월요일", "1855-3946"))).isEqualTo("CREATED");
        assertThat(jdbc.queryForObject("select verification_status from place_operating_info where place_id=?", String.class, imported.placeId()))
                .isEqualTo("UNVERIFIED");
        assertThat(jdbc.queryForObject("select verified_at from place_operating_info where place_id=?", java.time.LocalDateTime.class, imported.placeId())).isNull();
        assertThat(jdbc.queryForObject("select collected_at from place_operating_info where place_id=?", java.time.LocalDateTime.class, imported.placeId())).isNotNull();
        jdbc.update("update place_operating_info set verification_status='NEEDS_REVIEW',review_note='공식 안내와 다름' where place_id=?", imported.placeId());
        assertThat(operatingWriter.saveInitial(new TourOperatingSnapshot("106", "다른 시간", null, null))).isEqualTo("SKIPPED");
        assertThat(jdbc.queryForObject("select operating_hours from place_operating_info where place_id=?", String.class, imported.placeId())).isEqualTo("평일 10:00");
        assertThat(jdbc.queryForObject("select review_note from place_operating_info where place_id=?", String.class, imported.placeId())).isEqualTo("공식 안내와 다름");
    }

    @Test void invalidOperatingCollectionRollsBackAndCanBeRetried() {
        var imported = writer.save(candidate("107"));
        assertThatThrownBy(() -> operatingWriter.saveInitial(new TourOperatingSnapshot("107", null, null, null)))
                .isInstanceOf(RuntimeException.class);
        assertThat(jdbc.queryForObject("select count(*) from place_operating_info where place_id=?", Integer.class, imported.placeId())).isZero();
        assertThat(operatingWriter.saveInitial(new TourOperatingSnapshot("107", "10:00", null, null))).isEqualTo("CREATED");
        assertThatThrownBy(() -> operatingWriter.saveInitial(new TourOperatingSnapshot("999999", "10:00", null, null)))
                .isInstanceOf(RuntimeException.class);
    }

    private TourImportCandidate candidate(String id) {
        return new TourApiNormalizer().normalize(TourApiTests.target(id), TourApiTests.place(id, "126.1", ""));
    }

    @Test void savesDraftWithUnverifiedSourceAndSkipsWithoutOverwriting() {
        var result = writer.save(candidate("101"));
        assertThat(result.status()).isEqualTo(TourImportResult.Status.CREATED);
        long id = result.placeId();
        assertThat(jdbc.queryForObject("select publish_status from place where place_id=?", Integer.class, id)).isZero();
        assertThat(jdbc.queryForMap("select reviewed_at, operation_status from place where place_id=?", id))
                .allSatisfy((key, value) -> assertThat(value).isNull());
        assertThat(jdbc.queryForMap("select verified_at, verified_fields, verifier_id from source_record where place_id=?", id))
                .allSatisfy((key, value) -> assertThat(value).isNull());
        assertThat(jdbc.queryForObject("select collected_at from tour_api_import where content_id='101'", java.time.LocalDateTime.class)).isNotNull();
        assertThat(jdbc.queryForObject("select count(*) from place_activity where place_id=? and environment_type is null", Integer.class, id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from place_activity_season s join place_activity a on a.place_activity_id=s.place_activity_id where a.place_id=?", Integer.class, id)).isZero();
        jdbc.update("update place set name='운영자 검수 결과', publish_status=1 where place_id=?", id);
        var again = writer.save(candidate("101"));
        assertThat(again.status()).isEqualTo(TourImportResult.Status.SKIPPED);
        assertThat(again.placeId()).isEqualTo(id);
        assertThat(jdbc.queryForObject("select name from place where place_id=?", String.class, id)).isEqualTo("운영자 검수 결과");
        assertThat(jdbc.queryForObject("select count(*) from source_record where type='TOUR_API' and origin_id='101'", Integer.class)).isEqualTo(1);
    }

    @Test void concurrentImportsProduceExactlyOnePlace() throws Exception {
        var gate = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> { gate.await(); return writer.save(candidate("102")); });
            var second = pool.submit(() -> { gate.await(); return writer.save(candidate("102")); });
            gate.countDown();
            var results = List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
            assertThat(results).extracting(TourImportResult::status).containsExactlyInAnyOrder(
                    TourImportResult.Status.CREATED, TourImportResult.Status.SKIPPED);
            assertThat(results.getFirst().placeId()).isEqualTo(results.getLast().placeId());
        }
        assertThat(jdbc.queryForObject("select count(*) from source_record where type='TOUR_API' and origin_id='102'", Integer.class)).isEqualTo(1);
    }

    @Test void failedSaveRollsBackPlaceAndSourceAndNextTargetStillSucceeds() {
        var badTarget = new TourImportTarget("103", "테스트 시설", "수상", List.of("가".repeat(51)));
        var original = candidate("103");
        var bad = new TourImportCandidate(badTarget, original.name(), original.description(), original.address(),
                original.latitude(), original.longitude(), original.homepage(), original.regionCode(), original.regionName(),
                original.districtCode(), original.districtName(), original.originUpdatedAt(), original.imageCopyrightCode());
        int before = jdbc.queryForObject("select count(*) from place", Integer.class);
        assertThatThrownBy(() -> writer.save(bad)).isInstanceOf(RuntimeException.class);
        assertThat(jdbc.queryForObject("select count(*) from place", Integer.class)).isEqualTo(before);
        assertThat(jdbc.queryForObject("select count(*) from source_record where origin_id='103'", Integer.class)).isZero();
        assertThat(writer.findExistingPlaceId("103")).isNull();
        assertThat(writer.save(candidate("104")).status()).isEqualTo(TourImportResult.Status.CREATED);
    }

    @Test void networkIsOutsideSaveTransactionAndNormalStartupDoesNotCollect() {
        assertThat(jdbc.queryForObject("select count(*) from tour_api_import where content_id='105'", Integer.class)).isZero();
        var client = new TourApiClient(id -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return "invalid";
        });
        var result = new TourApiImportService(client, new TourApiNormalizer(), writer)
                .importPlaces(List.of(TourApiTests.target("105")));
        assertThat(result.getFirst().status()).isEqualTo(TourImportResult.Status.FAILED);
        assertThat(writer.findExistingPlaceId("105")).isNull();
    }
}
