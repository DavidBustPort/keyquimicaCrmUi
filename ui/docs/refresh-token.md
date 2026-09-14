# Renovación de sesión

Angular renueva ante un 401 de SianCoreApi, comparte una renovación entre peticiones simultáneas y reintenta cada petición una vez. No renueva llamadas de autenticación, errores 403 ni URLs externas. Una renovación fallida limpia las credenciales de API; las respuestas tardías de una sesión anterior se descartan. Los tokens permanecen en memoria.

SianCoreApi expone POST /auth/refresh-token con { refreshToken }. El login entrega un token aleatorio y guarda su hash SHA-256. La renovación consume el anterior y almacena el siguiente dentro de una transacción SQL, usando RAISERROR y ROLLBACK. El usuario y la sucursal provienen de la fila almacenada; SucursalId NULL conserva modo central.

Dependencia: dbo.RefreshTokens en sianwebcentralConnection, con las columnas de la API anterior: Id, UserId, SucursalId (nullable), Token (256 caracteres), ExpiryDate, IsActive, CreateAt y RevokedAt. La expiración del refresh token es de 30 días. No se realizaron cambios ni escrituras en la base de datos durante esta tarea.

Después de reiniciar la API, vuelve a cargar Angular para obtener credenciales nuevas. Los refresh tokens anteriores en texto plano y el valor fijo de prueba no son aceptados por el endpoint nuevo. Falta validar la conexión y la rotación con la base de datos real.

Pruebas: auth-refresh.spec.ts cubre concurrencia, modo central, errores y cambio de sesión. .verification/refresh-tests verifica handlers con base simulada; no reemplaza la prueba de concurrencia transaccional sobre SQL Server.
