# Reportes: Tracking de cerrados y Prospección

Origen: D:/Leo26102019/Gibraltar/Repos/sianwebcrm3nov2025/ui y api.
Destino: Angular en este proyecto y D:/Eeyore/KeyQuimica/SianCoreApi.

- GET /crm/reports/tracking-cerrados: Mes, Anio, Categoria, TipoCliente, IsGte, IdRik, SucursalId.
- GET /crm/reports/prospeccion: MesInicio, AnioInicio, MesFinal, AnioFinal, TipoCliente, IsGte, IdRik, SucursalId.
- SucursalId solo aplica en central; omitirlo consulta todas. El RIK de sucursal se obtiene de la sesión salvo consulta de gerente.
- Se preservan los procedimientos *_Reporte y *_Datos del origen, incluidas sus variantes Central. Los procedimientos deben existir en las bases destino; no se modificó SQL.
- Los archivos se generan con IExcelReportBuilder, con resumen y detalle. Tracking calcula la efectividad sin redondear el cociente antes de convertirlo a porcentaje.
- Gestión de proyectos conserva su contrato de filtros. Los tres endpoints responden con archivo binario en éxito y error JSON en HTTP 400 cuando no hay datos o el resultado falla. Angular interpreta ese mensaje.

## Verificación

Angular: 11 pruebas de Reportes aprobadas. API: 30 comprobaciones con base simulada y Excel real (tests/Reportes.SmokeTests). Compilación de Angular y API correcta. No se ejecutaron consultas contra las bases reales. Reiniciar la instancia de SianCoreApi que estaba abierta para cargar los nuevos endpoints.

## Refresh token: revisión

- La API de origen implementa RefreshTokenCommand: consulta el token almacenado, lo invalida y genera uno nuevo.
- SianCoreApi solamente expone POST /auth/token. AuthHandler devuelve el literal rfrdfh-token; no existe endpoint de renovación ni persistencia/rotación del refresh token.
- Angular almacena refreshToken pero AuthService solo implementa login. El interceptor agrega el access token; no renueva ni reintenta ante HTTP 401. refreshRequest$ está declarado pero no se usa.
- La renovación no está implementada de extremo a extremo. Esta migración verifica su estado; no agrega un endpoint ficticio ni usa login como sustituto de renovación.
