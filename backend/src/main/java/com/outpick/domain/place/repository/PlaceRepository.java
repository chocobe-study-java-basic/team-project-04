package com.outpick.domain.place.repository;

import com.outpick.domain.place.entity.Place;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceRepository extends JpaRepository<Place, Long> {
}
