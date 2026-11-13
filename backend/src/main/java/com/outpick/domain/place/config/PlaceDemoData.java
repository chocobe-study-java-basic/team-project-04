package com.outpick.domain.place.config;

import com.outpick.domain.place.entity.ActivityCategory;
import com.outpick.domain.place.entity.ActivityType;
import com.outpick.domain.place.entity.Place;
import com.outpick.domain.place.entity.PlaceActivity;
import com.outpick.domain.place.entity.PlaceActivitySeason;
import com.outpick.domain.place.entity.PlacePublishStatus;
import com.outpick.domain.place.entity.Region;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/** 실제 장소가 아닌 로컬 화면 연결용 데이터. demo 프로필을 명시한 경우에만 실행한다. */
@Component
@Profile("demo & !prod")
@RequiredArgsConstructor
public class PlaceDemoData implements ApplicationRunner {
    private static final String MARKER = "OUTPICK-DEMO-V1";
    private final EntityManager em;

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        if (em.createQuery("select count(r) from Region r where r.code = :code", Long.class)
                .setParameter("code", MARKER).getSingleResult() > 0) return;
        var gangwon = save(Region.builder().code(MARKER).name("강원").build());
        var gyeonggi = save(Region.builder().code("OUTPICK-DEMO-GG").name("경기").build());
        Map<String, ActivityCategory> categories = new LinkedHashMap<>();
        for (String name : new String[]{"수상", "산악", "항공", "스키·보드", "체험", "실내"}) {
            categories.put(name, save(ActivityCategory.builder().name(name).build()));
        }
        var ski = type(categories, "스키·보드", "스키");
        var board = type(categories, "스키·보드", "스노보드");
        var surf = type(categories, "수상", "서핑");
        var zipline = type(categories, "체험", "짚라인");
        var climb = type(categories, "실내", "클라이밍");
        var kayak = type(categories, "수상", "카약");
        var snow = place(gangwon, "눈마루 리조트", "평창군", "37.37", "128.39");
        activity(snow, ski, "OUTDOOR", "WINTER");
        activity(snow, board, "OUTDOOR", "WINTER");
        activity(place(gangwon, "설원 파크", "정선군", "37.38", "128.66"), board, "OUTDOOR", "WINTER");
        activity(place(gangwon, "파도 서프 스테이션", "양양군", "38.075", "128.62"), surf, "OUTDOOR", "SUMMER", "AUTUMN");
        activity(place(gyeonggi, "숲길 어드벤처", "가평군", "37.83", "127.51"), zipline, "OUTDOOR", "SPRING", "SUMMER", "AUTUMN");
        activity(place(gyeonggi, "오름 클라이밍", "수원시", "37.28", "127.01"), climb, "INDOOR", "SPRING", "SUMMER", "AUTUMN", "WINTER");
        var mixed = place(gyeonggi, "물빛 액티비티 센터", "가평군", "37.80", "127.48");
        activity(mixed, kayak, "OUTDOOR", "SUMMER");
        activity(mixed, climb, "INDOOR", "WINTER");
    }

    private ActivityType type(Map<String, ActivityCategory> categories, String category, String name) {
        return save(ActivityType.builder().category(categories.get(category)).name(name).build());
    }

    private Place place(Region parent, String name, String district, String lat, String lng) {
        var region = save(Region.builder().parent(parent).name(district).build());
        return save(Place.builder().region(region).name("[데모] " + name)
                .introduce("DB와 화면 연결을 검증하기 위한 가상 장소입니다. 실제 시설과 운영 정보가 아닙니다.")
                .address(parent.getName() + " " + district + " (가상 주소)")
                .latitude(new BigDecimal(lat)).longitude(new BigDecimal(lng))
                .publishStatus(PlacePublishStatus.PUBLISHED).build());
    }

    private void activity(Place place, ActivityType type, String environment, String... seasons) {
        var activity = save(PlaceActivity.builder().place(place).activityType(type).environmentType(environment).build());
        for (String season : seasons) save(PlaceActivitySeason.builder().placeActivity(activity).season(season).build());
    }

    private <T> T save(T entity) {
        em.persist(entity);
        return entity;
    }
}
