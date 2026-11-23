package com.outpick.domain.place.repository;

import com.outpick.domain.place.entity.PlaceChangeEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceChangeEventRepository extends JpaRepository<PlaceChangeEvent, Long> {
}
