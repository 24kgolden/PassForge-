# 🔐 PassForge — Gestor de Contraseñas

Aplicación web completa con **backend en Java (Spring Boot)** y frontend moderno.

---

## 📁 Estructura del proyecto

```
password-manager/
├── backend/                  ← Spring Boot (Java 17)
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/passgen/
│       │   ├── PasswordManagerApplication.java
│       │   ├── model/Password.java
│       │   ├── repository/PasswordRepository.java
│       │   ├── service/PasswordService.java
│       │   └── controller/PasswordController.java
│       └── resources/
│           └── application.properties
└── frontend/
    └── index.html            ← Aplicación web (funciona sin backend también)
```

---

## 🚀 Cómo ejecutar

### Requisitos
- Java 17+
- Maven 3.8+

### 1. Levantar el backend

```bash
cd backend
mvn spring-boot:run
```

El servidor arranca en **http://localhost:8080**

> La base de datos H2 se crea automáticamente en `./data/passdb`.  
> Panel H2: http://localhost:8080/h2-console (JDBC URL: `jdbc:h2:file:./data/passdb`)

### 2. Abrir el frontend

Abre `frontend/index.html` directamente en tu navegador.

El frontend detecta automáticamente si el backend está activo:
- ✅ **Con backend**: guarda en base de datos H2 real.
- 🔶 **Sin backend**: modo local usando `localStorage` del navegador.

---

## 🔌 API REST (endpoints)

| Método | Ruta                         | Descripción                             |
|--------|------------------------------|-----------------------------------------|
| POST   | `/api/passwords/generate`    | Genera contraseña sin guardar           |
| POST   | `/api/passwords`             | Genera y guarda en BD                   |
| POST   | `/api/passwords/save`        | Guarda contraseña externa               |
| GET    | `/api/passwords`             | Lista todas las contraseñas             |
| GET    | `/api/passwords?category=X` | Filtra por categoría                    |
| GET    | `/api/passwords?search=X`   | Busca por nombre                        |
| GET    | `/api/passwords/{id}`        | Obtiene contraseña por ID               |
| DELETE | `/api/passwords/{id}`        | Elimina contraseña                      |
| POST   | `/api/passwords/strength`    | Calcula fortaleza de una contraseña     |

### Ejemplo de petición

```bash
curl -X POST http://localhost:8080/api/passwords/generate \
  -H "Content-Type: application/json" \
  -d '{"length":20,"uppercase":true,"lowercase":true,"numbers":true,"symbols":true}'
```

```json
{
  "password": "aB3#mKx9!ZqR2vNp@cL0",
  "strength": 100
}
```

---

## 🔒 Seguridad

- Se usa `SecureRandom` para generación criptográficamente segura.
- Cada contraseña garantiza al menos un carácter de cada tipo seleccionado.
- Las contraseñas se almacenan en texto plano en la BD (puedes añadir cifrado AES en el `PasswordService`).

---

## 🛠️ Producción

Para producción, reemplaza la BD H2 por PostgreSQL/MySQL en `application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/passdb
spring.datasource.username=postgres
spring.datasource.password=tu_password
spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.hibernate.ddl-auto=update
```

Y añade la dependencia en `pom.xml`:
```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```
