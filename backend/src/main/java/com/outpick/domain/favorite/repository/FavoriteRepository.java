package com.outpick.domain.favorite.repository;

import com.outpick.domain.favorite.entity.Favorite;
import com.outpick.domain.place.entity.PlacePublishStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends Repository<Favorite, Long> {

    @Query("""
            select new com.outpick.domain.favorite.repository.FavoritePlaceRow(
                place.id, place.name, place.address, place.latitude, place.longitude,
                favorite.notified, place.publishStatus)
            from Favorite favorite join favorite.place place
            where favorite.memberId = :memberId and place.publishStatus in :publishStatuses
            order by favorite.createdAt desc, favorite.id desc
            """)
    List<FavoritePlaceRow> findPlaces(@Param("memberId") Long memberId,
                                      @Param("publishStatuses") List<PlacePublishStatus> publishStatuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select favorite from Favorite favorite join favorite.place place
            where favorite.memberId = :memberId and place.id = :placeId and place.publishStatus = :publishStatus
            """)
    Optional<Favorite> findForNotificationUpdate(@Param("memberId") Long memberId,
                                                  @Param("placeId") long placeId,
                                                  @Param("publishStatus") PlacePublishStatus publishStatus);

    @Modifying
    @Query(value = """
            INSERT INTO favorite (user_id, place_id) VALUES (:memberId, :placeId)
            """, nativeQuery = true)
    void insert(@Param("memberId") Long memberId, @Param("placeId") long placeId);

    @Modifying
    @Query("delete from Favorite favorite where favorite.memberId = :memberId and favorite.place.id = :placeId")
    void deleteForMember(@Param("memberId") Long memberId, @Param("placeId") long placeId);
}
