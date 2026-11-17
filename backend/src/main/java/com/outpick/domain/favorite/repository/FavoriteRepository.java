package com.outpick.domain.favorite.repository;

import com.outpick.domain.favorite.entity.Favorite;
import com.outpick.domain.place.dto.PlaceSummaryResponse;
import com.outpick.domain.place.entity.PlacePublishStatus;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FavoriteRepository extends Repository<Favorite, Long> {

    @Query("""
            select new com.outpick.domain.place.dto.PlaceSummaryResponse(
                place.id, place.name, place.address, place.latitude, place.longitude)
            from Favorite favorite join favorite.place place
            where favorite.memberId = :memberId and place.publishStatus = :publishStatus
            order by favorite.createdAt desc, favorite.id desc
            """)
    List<PlaceSummaryResponse> findPlaces(@Param("memberId") Long memberId,
                                         @Param("publishStatus") PlacePublishStatus publishStatus);

    @Modifying
    @Query(value = """
            INSERT INTO favorite (user_id, place_id) VALUES (:memberId, :placeId)
            ON DUPLICATE KEY UPDATE favorite_id = favorite_id
            """, nativeQuery = true)
    void saveIfAbsent(@Param("memberId") Long memberId, @Param("placeId") long placeId);

    @Modifying
    @Query("delete from Favorite favorite where favorite.memberId = :memberId and favorite.place.id = :placeId")
    void deleteForMember(@Param("memberId") Long memberId, @Param("placeId") long placeId);
}
