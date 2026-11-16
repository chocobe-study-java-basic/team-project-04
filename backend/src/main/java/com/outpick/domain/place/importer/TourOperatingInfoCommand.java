package com.outpick.domain.place.importer;

import com.outpick.BackendApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;

/** 1차 검증 대상인 플라이스테이션만 명시적으로 수집한다. 갱신 비교는 후속 범위다. */
public class TourOperatingInfoCommand {
    public static void main(String[] args) {
        var transport = new TourApiHttpTransport(System.getenv("TOUR_API_KEY"));
        // HTTP 호출은 DB 트랜잭션/잠금 밖에서 수행하며 실패 시 DB를 시작하지 않는다.
        var snapshot = new TourApiOperatingClient(transport).getOperatingInfo("2623831");
        try (var context = new SpringApplicationBuilder(BackendApplication.class)
                .web(WebApplicationType.NONE).run("--spring.profiles.active=local")) {
            String status = context.getBean(TourOperatingInfoWriter.class).saveInitial(snapshot);
            System.out.printf("TOUR_OPERATING contentId=2623831 status=%s%n", status);
        }
    }
}
