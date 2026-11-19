package com.outpick.domain.place.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record AdminPlaceRequest(
        @NotNull @Positive Long regionId,
        @NotBlank @Size(max = 50) String name,
        @NotBlank @Size(max = 100) String address,
        @Size(max = 2000) String description,
        @NotNull @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude
) {}
