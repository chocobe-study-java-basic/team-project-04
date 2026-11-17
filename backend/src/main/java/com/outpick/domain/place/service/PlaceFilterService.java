package com.outpick.domain.place.service;

import com.outpick.domain.place.dto.PlaceFilterResponse;
import com.outpick.domain.place.entity.ActivityCategory;
import com.outpick.domain.place.entity.ActivityType;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlaceFilterService {
    private final EntityManager em;

    public PlaceFilterResponse getFilters() {
        var regions = em.createQuery("""
                select new com.outpick.domain.place.dto.PlaceFilterResponse$RegionOption(r.id, r.name)
                from Region r where r.parent is null and r.name is not null order by r.name, r.id
                """, PlaceFilterResponse.RegionOption.class).getResultList();
        var types = em.createQuery("select a from ActivityType a join fetch a.category order by a.id", ActivityType.class)
                .getResultList().stream().collect(Collectors.groupingBy(
                        type -> type.getCategory().getId(), Collectors.mapping(ActivityType::getId, Collectors.toList())));
        var categories = em.createQuery("select c from ActivityCategory c where c.name is not null order by c.id", ActivityCategory.class)
                .getResultList().stream().map(category -> new PlaceFilterResponse.CategoryOption(
                        category.getId(), category.getName(), types.getOrDefault(category.getId(), List.of()))).toList();
        return new PlaceFilterResponse(regions, categories);
    }
}
