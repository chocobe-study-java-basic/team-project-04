package com.outpick.domain.place.entity;

public enum PlacePublishStatus {
    DRAFT((byte) 0),
    PUBLISHED((byte) 1),
    HIDDEN((byte) 2);

    private final byte code;

    PlacePublishStatus(byte code) {
        this.code = code;
    }

    public byte getCode() {
        return code;
    }

    public static PlacePublishStatus fromCode(byte code) {
        return switch (code) {
            case 0 -> DRAFT;
            case 1 -> PUBLISHED;
            case 2 -> HIDDEN;
            default -> throw new IllegalArgumentException("지원하지 않는 장소 게시 상태입니다.");
        };
    }
}
