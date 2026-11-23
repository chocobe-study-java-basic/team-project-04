package com.outpick.domain.place.repository;

import com.outpick.domain.place.dto.PlaceNoticeResponse;
import com.outpick.domain.place.dto.PlaceSourceResponse;
import com.outpick.domain.place.entity.Place;
import com.outpick.domain.place.entity.PlaceActivity;
import com.outpick.domain.place.entity.PlaceActivitySeason;
import com.outpick.domain.place.entity.PlacePublishStatus;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class PlaceDetailRepository {
    private final EntityManager entityManager;

    public Optional<Place> findPublishedPlace(long placeId) {
        return entityManager.createQuery("""
                select p from Place p left join fetch p.representativeImage left join fetch p.operatingInfo
                where p.id = :id and p.publishStatus = :published
                """, Place.class)
                .setParameter("id", placeId).setParameter("published", PlacePublishStatus.PUBLISHED)
                .getResultStream().findFirst();
    }

    public List<PlaceActivity> findActivities(long placeId) {
        return entityManager.createQuery("""
                select a from PlaceActivity a join fetch a.activityType
                where a.place.id = :id order by a.id
                """, PlaceActivity.class).setParameter("id", placeId).getResultList();
    }

    public List<PlaceActivitySeason> findSeasons(long placeId) {
        return entityManager.createQuery("""
                select s from PlaceActivitySeason s where s.placeActivity.place.id = :id
                order by s.placeActivity.id, s.season
                """, PlaceActivitySeason.class).setParameter("id", placeId).getResultList();
    }

    public List<PlaceSourceResponse> findVerifiedSources(long placeId) {
        return entityManager.createQuery("""
                select new com.outpick.domain.place.dto.PlaceSourceResponse(
                    s.id, s.type, s.url, s.verifiedFields, s.originUpdatedAt, s.verifiedAt)
                from SourceRecord s where s.place.id = :id and s.verifiedAt is not null
                order by s.verifiedAt desc, s.id desc
                """, PlaceSourceResponse.class).setParameter("id", placeId).getResultList();
    }

    public List<PlaceNoticeResponse> findActiveNotices(long placeId, LocalDateTime now) {
        return entityManager.createQuery("""
                select new com.outpick.domain.place.dto.PlaceNoticeResponse(
                    n.id, n.title, n.content, n.validFrom, n.validUntil, s.id)
                from PlaceNotice n join n.sourceRecord s
                where n.place.id = :id and n.publishStatus = :published and s.verifiedAt is not null
                    and (n.validFrom is null or n.validFrom <= :now)
                    and (n.validUntil is null or n.validUntil > :now)
                order by n.validFrom desc, n.id desc
                """, PlaceNoticeResponse.class).setParameter("id", placeId)
                .setParameter("published", PlacePublishStatus.PUBLISHED).setParameter("now", now).getResultList();
    }
}
