package com.passgen.service;

import com.passgen.model.Password;
import com.passgen.repository.PasswordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class PasswordService {

    private static final String UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
    private static final String NUMBERS   = "0123456789";
    private static final String SYMBOLS   = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    private final SecureRandom random = new SecureRandom();

    @Autowired
    private PasswordRepository repository;

    /**
     * Generates a secure random password based on the given options.
     */
    public String generatePassword(int length, boolean uppercase, boolean lowercase,
                                   boolean numbers, boolean symbols) {
        if (length < 4 || length > 128) {
            throw new IllegalArgumentException("La longitud debe estar entre 4 y 128 caracteres.");
        }
        if (!uppercase && !lowercase && !numbers && !symbols) {
            throw new IllegalArgumentException("Debes seleccionar al menos un tipo de carácter.");
        }

        StringBuilder charset = new StringBuilder();
        List<Character> guaranteed = new ArrayList<>();

        if (uppercase) {
            charset.append(UPPERCASE);
            guaranteed.add(randomChar(UPPERCASE));
        }
        if (lowercase) {
            charset.append(LOWERCASE);
            guaranteed.add(randomChar(LOWERCASE));
        }
        if (numbers) {
            charset.append(NUMBERS);
            guaranteed.add(randomChar(NUMBERS));
        }
        if (symbols) {
            charset.append(SYMBOLS);
            guaranteed.add(randomChar(SYMBOLS));
        }

        String pool = charset.toString();
        List<Character> passwordChars = new ArrayList<>(guaranteed);

        // Fill remaining characters
        for (int i = guaranteed.size(); i < length; i++) {
            passwordChars.add(pool.charAt(random.nextInt(pool.length())));
        }

        // Shuffle to avoid predictable positions
        Collections.shuffle(passwordChars, random);

        StringBuilder result = new StringBuilder();
        for (char c : passwordChars) result.append(c);
        return result.toString();
    }

    private char randomChar(String source) {
        return source.charAt(random.nextInt(source.length()));
    }

    /**
     * Saves a password entry to the database.
     */
    public Password savePassword(String name, String passwordValue, String category,
                                  String notes, int length, boolean uppercase,
                                  boolean lowercase, boolean numbers, boolean symbols) {
        Password pw = new Password(name, passwordValue, category, notes,
                                   length, uppercase, lowercase, numbers, symbols);
        return repository.save(pw);
    }

    /**
     * Returns all saved passwords ordered by creation date.
     */
    public List<Password> getAllPasswords() {
        return repository.findAllByOrderByCreatedAtDesc();
    }

    /**
     * Returns passwords filtered by category.
     */
    public List<Password> getByCategory(String category) {
        return repository.findByCategory(category);
    }

    /**
     * Searches passwords by name.
     */
    public List<Password> searchByName(String name) {
        return repository.findByNameContainingIgnoreCase(name);
    }

    /**
     * Deletes a password by its ID.
     */
    public void deletePassword(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Contraseña con ID " + id + " no encontrada.");
        }
        repository.deleteById(id);
    }

    /**
     * Retrieves a password by ID.
     */
    public Optional<Password> getById(Long id) {
        return repository.findById(id);
    }

    /**
     * Calculates the strength score of a password (0–100).
     */
    public int calculateStrength(String password) {
        int score = 0;
        if (password.length() >= 8)  score += 20;
        if (password.length() >= 12) score += 10;
        if (password.length() >= 16) score += 10;
        if (password.matches(".*[A-Z].*")) score += 15;
        if (password.matches(".*[a-z].*")) score += 15;
        if (password.matches(".*[0-9].*")) score += 15;
        if (password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{}|;:,.<>?].*")) score += 15;
        return Math.min(score, 100);
    }
}
