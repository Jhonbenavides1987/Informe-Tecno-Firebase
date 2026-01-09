const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// --- FUNCIÓN GENÉRICA PARA PROCESAR IMPLEMENTACIONES SIMPLES ---
const createImplementationMarker = (config) => {
  return functions.firestore
    .document(`${config.sourceCollection}/{docId}`)
    .onCreate(async (snap, context) => {
      const newData = snap.data();
      // **CAMBIO CLAVE**: Usar el campo de origen configurado o usar 'ID_PDV' como valor por defecto.
      const sourceIdField = config.sourceIdField || 'ID_PDV';
      const pdvIdAsString = newData[sourceIdField];

      if (!pdvIdAsString) {
        functions.logger.warn(`Documento en ${config.sourceCollection} ${context.params.docId} no tiene el campo '${sourceIdField}'.`);
        return null;
      }

      const pdvIdAsNumber = parseInt(pdvIdAsString, 10);
      if (isNaN(pdvIdAsNumber)) {
        functions.logger.error(`El ID de '${sourceIdField}' en ${config.logName} ('${pdvIdAsString}') no es un número válido.`);
        return null;
      }

      functions.logger.log(`Procesando ${config.logName}. Buscando IDPDV: ${pdvIdAsNumber}`);

      try {
        const baseRef = db.collection(config.targetCollection);
        // El campo en la colección de destino sigue siendo 'IDPDV'
        const querySnapshot = await baseRef.where("IDPDV", "==", pdvIdAsNumber).get();

        if (querySnapshot.empty) {
          functions.logger.error(`No se encontró en ${config.targetCollection} para IDPDV: ${pdvIdAsNumber} (proveniente de ${sourceIdField}).`);
          return null;
        }

        const batch = db.batch();
        querySnapshot.forEach(doc => {
          functions.logger.log(`Marcando ${config.logName} como implementado: ${doc.id}`);
          batch.update(doc.ref, { [config.implementationField]: true });
        });

        await batch.commit();
        functions.logger.log(`Éxito para ${config.logName} con IDPDV: ${pdvIdAsNumber}`);
        return { success: true };

      } catch (error) {
        functions.logger.error(`Error al actualizar ${config.targetCollection} para ${config.logName}`, error);
        return null;
      }
    });
};

// --- Exportaciones de funciones de implementación simples ---
exports.markAsImplementedPospago = createImplementationMarker({ sourceCollection: 'Implementacion Pospago', targetCollection: 'Base Pospago', implementationField: 'implementado', logName: 'Pospago' });
exports.markAsImplementedPrepago = createImplementationMarker({ sourceCollection: 'Implementacion Prepago', targetCollection: 'Base Prepago', implementationField: 'implementado', logName: 'Prepago' });
exports.markAsImplementedDurable = createImplementationMarker({ sourceCollection: 'Implementacion Durable', targetCollection: 'Base Prepago', implementationField: 'implementado_durable', logName: 'Durable' });
exports.markAsImplementedActivacion = createImplementationMarker({ sourceCollection: 'Implementacion Activacion', targetCollection: 'Base Prepago', implementationField: 'implementado_activacion', logName: 'Activacion' });

// **CAMBIO CLAVE**: Especificar el campo de origen para Aliados.
exports.markAsImplementedAliados = createImplementationMarker({
    sourceCollection: 'Implementacion Aliados',
    targetCollection: 'Base Prepago',
    implementationField: 'implementado_aliados',
    logName: 'Aliados',
    sourceIdField: 'POS_ID' // <-- ¡Aquí está la magia!
});

// --- LÓGICA DE PROGRESO DE CALENDARIOS ---
const calculateProgress = async (branchName, collectionConfig) => {
    const progressRef = db.collection(collectionConfig.progressCollection).doc(String(branchName));

    try {
        await db.runTransaction(async (transaction) => {
            const progressDoc = await transaction.get(progressRef);
            const metaRef = db.collection(collectionConfig.metaCollection).doc(String(branchName));
            const metaDoc = await metaRef.get(); // Se obtiene fuera de la lógica condicional para estar siempre disponible
            
            const meta = metaDoc.exists ? metaDoc.data().meta : 0;

            if (!progressDoc.exists) {
                const conteo = 1;
                const porcentaje = meta > 0 ? (conteo / meta) * 100 : 0;
                transaction.set(progressRef, {
                    BRANCH: branchName,
                    meta: meta,
                    conteo_implementado: conteo,
                    porcentaje: porcentaje
                });
                functions.logger.log(`Creado progreso para ${branchName} en ${collectionConfig.progressCollection}. Meta: ${meta}, Conteo: ${conteo}`);
            } else {
                const data = progressDoc.data();
                const conteo = (data.conteo_implementado || 0) + 1;
                const porcentaje = meta > 0 ? (conteo / meta) * 100 : 0;
                transaction.update(progressRef, { 
                    conteo_implementado: conteo,
                    porcentaje: porcentaje
                });
                functions.logger.log(`Actualizado progreso para ${branchName} en ${collectionConfig.progressCollection}. Conteo: ${conteo}`);
            }
        });
    } catch (error) {
        functions.logger.error(`Error en la transacción de progreso para ${branchName} en ${collectionConfig.progressCollection}`, error);
    }
};

const updateMeta = async (snap, context, collectionConfig) => {
    const branchName = context.params.sucursalId;
    const newData = snap.data();
    const newMeta = newData.meta;

    const progressRef = db.collection(collectionConfig.progressCollection).doc(branchName);
    const progressDoc = await progressRef.get();

    if (progressDoc.exists) {
        const data = progressDoc.data();
        const conteo = data.conteo_implementado || 0;
        const porcentaje = newMeta > 0 ? (conteo / newMeta) * 100 : 0;

        await progressRef.update({ meta: newMeta, porcentaje: porcentaje });
        functions.logger.log(`Meta actualizada para ${branchName} en ${collectionConfig.progressCollection}. Nuevo porcentaje: ${porcentaje}`);
    }
};

// --- Triggers para Calendarios ---
exports.calculateCalendariosProgress = functions.firestore
    .document("ImplementacionCalendarios/{docId}")
    .onCreate((snap) => calculateProgress(snap.data().BRANCH, { progressCollection: 'ProgresoCalendarios', metaCollection: 'MetasCalendarios' }));

exports.updateCalendariosMeta = functions.firestore
    .document("MetasCalendarios/{sucursalId}")
    .onWrite((change, context) => updateMeta(change.after, context, { progressCollection: 'ProgresoCalendarios' }));

// --- Triggers para Porta Afiches ---
exports.calculatePortaAfichesProgress = functions.firestore
    .document("ImplementacionPortaAfiches/{docId}")
    .onCreate((snap) => calculateProgress(snap.data().BRANCH, { progressCollection: 'ProgresoPortaAfiches', metaCollection: 'MetasPortaAfiches' }));

exports.updatePortaAfichesMeta = functions.firestore
    .document("MetasPortaAfiches/{sucursalId}")
    .onWrite((change, context) => updateMeta(change.after, context, { progressCollection: 'ProgresoPortaAfiches' }));

// --- FUNCIÓN DE ENRIQUECIMIENTO PARA PLANEACIÓN ---
exports.enrichPlaneacionData = functions.firestore
    .document("UploadPlaneacion/{docId}")
    .onCreate(async (snap) => {
      const originalData = snap.data();
      const pdvIdAsString = originalData.ID_PDV; 

      if (!pdvIdAsString) return null;
      const pdvIdAsNumber = parseInt(pdvIdAsString, 10);
      if (isNaN(pdvIdAsNumber)) return null;

      try {
        const querySnapshot = await db.collection("Base Prepago").where("IDPDV", "==", pdvIdAsNumber).limit(1).get();
        let enrichedData = { ...originalData, IDPDV: pdvIdAsNumber, Mesa: null, Ruta: null, fechaEnriquecimiento: admin.firestore.FieldValue.serverTimestamp() };

        if (!querySnapshot.empty) {
          const prepagoDoc = querySnapshot.docs[0].data();
          enrichedData.Mesa = prepagoDoc.MESA || null;
          enrichedData.Ruta = prepagoDoc.RUTA || null;
        }

        await db.collection("Planeacion").add(enrichedData);
        return { success: true };
      } catch (error) {
        functions.logger.error(`Error en enriquecimiento de Planeación para IDPDV: ${pdvIdAsNumber}`, error);
        return null;
      }
    });
