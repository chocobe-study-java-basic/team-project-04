package com.outpick.domain.place.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** enum 선언 순서가 바뀌어도 저장된 숫자의 의미를 유지한다. */
@Converter
public class PlacePublishStatusConverter implements AttributeConverter<PlacePublishStatus, Byte> {
    @Override
    public Byte convertToDatabaseColumn(PlacePublishStatus status) {
        return status == null ? null : status.getCode();
    }

    @Override
    public PlacePublishStatus convertToEntityAttribute(Byte code) {
        return code == null ? null : PlacePublishStatus.fromCode(code);
    }
}
