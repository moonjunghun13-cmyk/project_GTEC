package com.gtec.mall.product.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
public class ProductImageController {

    private static final Logger log = LoggerFactory.getLogger(ProductImageController.class);
    private static final int MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    private static final String IMAGE_URL_PREFIX = "/media/product-images/";
    private static final Pattern IMAGE_FILENAME =
            Pattern.compile("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.(png|jpg|webp)");
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/png", "png", "image/jpeg", "jpg", "image/webp", "webp");
    private static final Map<String, String> CONTENT_TYPES = Map.of(
            "png", "image/png", "jpg", "image/jpeg", "webp", "image/webp");

    private final Path storageDirectory;

    public ProductImageController(@Value("${app.product-images.directory:./product-images}") String directory) {
        storageDirectory = Path.of(directory).toAbsolutePath().normalize();
    }

    @PostMapping("/api/admin/product-images")
    public ResponseEntity<Map<String, String>> upload(HttpServletRequest request) {
        String contentType = request.getContentType();
        String extension = contentType == null ? null : EXTENSIONS.get(contentType);
        if (extension == null) {
            return error(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "PNG·JPG·WebP 이미지를 선택해 주세요.");
        }
        if (request.getContentLengthLong() > MAX_IMAGE_BYTES) {
            return error(HttpStatus.PAYLOAD_TOO_LARGE, "이미지는 파일당 5MB 이하로 올려 주세요.");
        }

        try {
            byte[] bytes = request.getInputStream().readNBytes(MAX_IMAGE_BYTES + 1);
            if (bytes.length > MAX_IMAGE_BYTES) {
                return error(HttpStatus.PAYLOAD_TOO_LARGE, "이미지는 파일당 5MB 이하로 올려 주세요.");
            }
            if (!hasImageSignature(bytes, extension)) {
                return error(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "파일 내용이 선택한 이미지 형식과 일치하지 않습니다.");
            }

            String filename = UUID.randomUUID() + "." + extension;
            Files.createDirectories(storageDirectory);
            Path temporaryFile = Files.createTempFile(storageDirectory, "upload-", ".tmp");
            try {
                Files.write(temporaryFile, bytes);
                Files.move(temporaryFile, storageDirectory.resolve(filename), StandardCopyOption.ATOMIC_MOVE);
            } finally {
                Files.deleteIfExists(temporaryFile);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("url", IMAGE_URL_PREFIX + filename));
        } catch (IOException exception) {
            log.error("Failed to save product image", exception);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "이미지 파일 저장에 실패했습니다.");
        }
    }

    @GetMapping(IMAGE_URL_PREFIX + "{filename}")
    public ResponseEntity<Resource> read(@PathVariable("filename") String filename) {
        var matcher = IMAGE_FILENAME.matcher(filename);
        if (!matcher.matches()) {
            return ResponseEntity.notFound().build();
        }
        Path image = storageDirectory.resolve(filename);
        if (!Files.isRegularFile(image) || !Files.isReadable(image)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(CONTENT_TYPES.get(matcher.group(1))))
                .body(new FileSystemResource(image));
    }

    private static boolean hasImageSignature(byte[] bytes, String extension) {
        return switch (extension) {
            case "png" -> matches(bytes, 0, (byte) 0x89, (byte) 'P', (byte) 'N', (byte) 'G',
                    (byte) 13, (byte) 10, (byte) 26, (byte) 10);
            case "jpg" -> matches(bytes, 0, (byte) 0xff, (byte) 0xd8, (byte) 0xff);
            case "webp" -> matches(bytes, 0, (byte) 'R', (byte) 'I', (byte) 'F', (byte) 'F')
                    && matches(bytes, 8, (byte) 'W', (byte) 'E', (byte) 'B', (byte) 'P');
            default -> false;
        };
    }

    private static boolean matches(byte[] bytes, int offset, byte... signature) {
        int end = offset + signature.length;
        return bytes.length >= end && Arrays.equals(bytes, offset, end, signature, 0, signature.length);
    }

    private static ResponseEntity<Map<String, String>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }
}
