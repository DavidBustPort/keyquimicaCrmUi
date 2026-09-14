# Carga masiva de productos

La plantilla descargada contiene productoId, cantidad y precio, en ese orden. Conserva los dos encabezados del archivo de referencia y agrega precio. Los encabezados están protegidos y las filas 2 a 5001 permiten capturar valores.

La API valida estructura, campos obligatorios, identificadores/cantidades enteros positivos y precio numérico finito no negativo. Precio vacío o cero usa el precio de lista devuelto por la base de datos. No acepta fórmulas ni SKU duplicados dentro del mismo archivo. Las filas vacías se ignoran. Un error de estructura o valores rechaza el archivo completo y conserva la tabla de Angular.

La validación de existencia usa sp_crmv3_validarProductosExcel para la sucursal y segmento. Los productos válidos reciben cantidad del Excel y precioVenta del Excel cuando es positivo (en otro caso, precioLista de la base de datos), conservando precioLista y precioObjetivo como referencias del catálogo. La respuesta de importar-productos ahora contiene products y notFoundSkus. Los no encontrados se omiten sin bloquear los válidos.

Angular omite los SKU ya presentes en la tabla sin modificar sus cantidades ni precios; agrega los nuevos y muestra el resultado con los omitidos. La carga no guarda automáticamente: se confirma con Guardar productos y conserva las validaciones de autorización de precios existentes.

Despliegue: actualizar API y Angular juntos y descargar la nueva plantilla. La plantilla anterior de dos columnas ya no cumple el contrato. No se modificó el archivo original de Downloads ni se escribieron productos en la base durante las pruebas.

Validación: compilación de API/Angular, 13 comprobaciones de workbook/handler con BD simulada y 2 pruebas de importación en Angular. Falta prueba con catálogo real.
