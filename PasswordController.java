package com.passgen.controller;

import com.passgen.model.Password;
import com.passgen.service.PasswordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/passwords")
@CrossOrigin(origins = "*")
public class PasswordController {

    @Autowired
    private PasswordService service;

    /**
     * POST /api/passwords/generate
     * Generates a password without saving it.
     */
    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generate(@RequestBody Map<String, Object> body) {
        int length     = (int) body.getOrDefault("length", 16);
        boolean upper  = (boolean) body.getOrDefault("uppercase", true);
        boolean lower  = (boolean) body.getOrDefault("lowercase", true);
        boolean nums   = (boolean) body.getOrDefault("numbers", true);
        boolean syms   = (boolean) body.getOrDefault("symbols", false);

        String password = service.generatePassword(length, upper, lower, nums, syms);
        int strength    = service.calculateStrength(password);

        Map<String, Object> response = new HashMap<>();
        response.put("password", password);
        response.put("strength", strength);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/passwords
     * Generates and saves a new password entry.
     */
    @PostMapping
    public ResponseEntity<Password> createAndSave(@RequestBody Map<String, Object> body) {
        String name     = (String) body.getOrDefault("name", "Sin nombre");
        String category = (String) body.getOrDefault("category", "General");
        String notes    = (String) body.getOrDefault("notes", "");
        int length      = (int) body.getOrDefault("length", 16);
        boolean upper   = (boolean) body.getOrDefault("uppercase", true);
        boolean lower   = (boolean) body.getOrDefault("lowercase", true);
        boolean nums    = (boolean) body.getOrDefault("numbers", true);
        boolean syms    = (boolean) body.getOrDefault("symbols", false);

        String pwd = service.generatePassword(length, upper, lower, nums, syms);
        Password saved = service.savePassword(name, pwd, category, notes, length, upper, lower, nums, syms);
        return ResponseEntity.ok(saved);
    }

    /**
     * POST /api/passwords/save
     * Saves an externally provided password value.
     */
    @PostMapping("/save")
    public ResponseEntity<Password> saveExisting(@RequestBody Map<String, Object> body) {
        String name     = (String) body.getOrDefault("name", "Sin nombre");
        String pwd      = (String) body.get("password");
        String category = (String) body.getOrDefault("category", "General");
        String notes    = (String) body.getOrDefault("notes", "");
        int length      = pwd != null ? pwd.length() : 0;

        if (pwd == null || pwd.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        Password saved = service.savePassword(name, pwd, category, notes, length, true, true, true, true);
        return ResponseEntity.ok(saved);
    }

    /**
     * GET /api/passwords
     * Returns all saved passwords.
     */
    @GetMapping
    public ResponseEntity<List<Password>> getAll(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {

        List<Password> result;
        if (category != null && !category.isBlank()) {
            result = service.getByCategory(category);
        } else if (search != null && !search.isBlank()) {
            result = service.searchByName(search);
        } else {
            result = service.getAllPasswords();
        }
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/passwords/{id}
     * Returns a single password by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Password> getById(@PathVariable Long id) {
        return service.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * DELETE /api/passwords/{id}
     * Deletes a password by ID.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deletePassword(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/passwords/strength
     * Calculates the strength of a given password.
     */
    @PostMapping("/strength")
    public ResponseEntity<Map<String, Integer>> strength(@RequestBody Map<String, String> body) {
        String pwd = body.getOrDefault("password", "");
        int score = service.calculateStrength(pwd);
        return ResponseEntity.ok(Map.of("strength", score));
    }
}
