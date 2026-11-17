CREATE TABLE `user` (
                        user_id BIGINT NOT NULL AUTO_INCREMENT,
                        email VARCHAR(100) NOT NULL,
                        nickname VARCHAR(50) NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        role VARCHAR(20) NOT NULL DEFAULT 'USER',
                        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                        created_at DATETIME(6) NOT NULL,
                        updated_at DATETIME(6) NOT NULL,
                        PRIMARY KEY (user_id),
                        CONSTRAINT uk_user_email UNIQUE (email)
);