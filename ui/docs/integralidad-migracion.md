# Integralidad

Ruta Angular: /integralidad. Visible en modo sucursal, con filtro de representante en el encabezado para gerentes y pantalla expandida.

Origen: SIANWEB/PortalRIK/GestionPromocion/Integralidadv2.aspx, js/Integralidad/Integralidadv2.js y CapaDatos/CD_IntegralidadV2.cs.

## Funciones

- Periodo mensual, UEN, segmento y búsqueda local por nombre/número de cliente.
- Consulta cancelable al actualizar nuevamente; carga, errores, paginación y desplazamiento al resultado.
- Tabla con ventas, VPT/VPO, coberturas, porcentajes ponderados y aplicaciones por cliente.
- Detalle de ventas por categoría y aplicaciones con venta/por desarrollar.
- Modal para potenciales; edición del mes actual para RIK, consulta de periodos históricos.
- Abrir CRM resuelve el prospecto del cliente mediante el buscador existente. Abre los datos del cliente; el alta y la selección de aplicaciones se realizan en el formulario existente de oportunidades.
- Excel resumen y detalle mediante IExcelReportBuilder. Exporta la consulta aplicada completa; la búsqueda de texto de cliente solo filtra la tabla local.

## API

Archivos incorporados en SianCoreApi/src/Application/Features/Crm/Integralidad y Web.Api/Endpoints/Crm/IntegralidadEndpoints.cs.

- GET /crm/integralidad
- PUT /crm/integralidad/potenciales
- GET /crm/integralidad/excel

Consulta: Month, Year, UenId, SegmentId, ClientId, RikId e IsManager. Sigue el contrato de selección de gerente/RIK de los reportes actuales. La sucursal se obtiene del contexto tenant.

Usa la conexión siancentralConnection y los procedimientos existentes spListIntegralidadBy (tipos 5 y 7) y sp_Actualizar_IntegralidadMes_VPT. No se crearon procedimientos SQL ni datos de prueba en producción. Los catálogos UEN/segmento se reutilizan de /catalogs.

El guardado valida periodo, valores no negativos y cliente/territorio en la cartera del representante. El precio para calcular VPT se consulta nuevamente en SQL.

## Validación

Compilación Angular y SianCoreApi. Pruebas Angular en integralidad.spec.ts; pruebas de handlers y Excel con base de datos simulada en .verification/integralidad-tests.

Para repetir la prueba de API desde Angular:

```powershell
dotnet build D:/Eeyore/KeyQuimica/SianCoreApi/src/Web.Api/Web.Api.csproj --no-restore -p:OutputPath=D:/Eeyore/DavidBustPort-repos/keyquimicaCrmUi/ui/.verification/integralidad-build/
dotnet run --project .verification/integralidad-tests/IntegralidadTests.csproj -p:UseAppHost=false
```

Reiniciar SianCoreApi para cargar los endpoints. Pendiente verificar visualmente en navegador, contrastar importes de clientes reales con SIANWEB y probar descargas/guardado con una sesión autorizada. No se hicieron escrituras en la base de datos durante la migración.
