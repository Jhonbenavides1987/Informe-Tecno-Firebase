const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// --- FUNCIÓN DE BORRADO RECURSIVO ---
// Borra una colección en lotes para evitar timeouts y problemas de memoria.
async function deleteCollection(collectionPath, batchSize) {
  const collectionRef = db.collection(collectionPath);
  // Limita la consulta a un número de documentos (lote)
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve, reject);
  });
}

async function deleteQueryBatch(query, resolve, reject) {
  try {
    const snapshot = await query.get();

    // Si no hay más documentos, hemos terminado.
    if (snapshot.size === 0) {
      resolve();
      return;
    }

    // Borra los documentos encontrados en un lote.
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Vuelve a llamar a la función en el siguiente ciclo de proceso para evitar
    // exceder la profundidad de la pila de llamadas.
    process.nextTick(() => {
      deleteQueryBatch(query, resolve, reject);
    });
  } catch (error) {
    reject(error);
  }
}

// --- FUNCIÓN HTTPS INVOCABLE PARA BORRAR COLECCIÓN ---
exports.deleteAllDocumentsInCollection = functions.https.onCall(async (data, context) => {
  // Asegurarse de que el usuario esté autenticado.
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'La función debe ser llamada por un usuario autenticado.');
  }
    
  const collectionPath = data.collectionPath;

  if (!collectionPath || typeof collectionPath !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'La función debe ser llamada con el argumento "collectionPath".');
  }

  functions.logger.log(`(v2) Solicitud de borrado para la colección: ${collectionPath} por usuario ${context.auth.uid}`);
  
  try {
    // Usamos un tamaño de lote de 200.
    await deleteCollection(collectionPath, 200);
    functions.logger.log(`(v2) Éxito al borrar la colección: ${collectionPath}`);
    return { success: true, message: `Se ha completado el borrado de ${collectionPath}` };
  } catch (error) {
    functions.logger.error(`(v2) Error al borrar la colección ${collectionPath}:`, error);
    throw new functions.https.HttpsError('internal', `No se pudo borrar la colección. Detalles: ${error.message}`);
  }
});


// --- LÓGICA DE IMPLEMENTACIONES (SIN CAMBIOS) ---
const createImplementationMarker = (config) => {
  return functions.firestore
    .document(`${config.sourceCollection}/{docId}`)
    .onCreate(async (snap, context) => {
      const newData = snap.data();
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
      
      try {
        const baseRef = db.collection(config.targetCollection);
        const querySnapshot = await baseRef.where("IDPDV", "==", pdvIdAsNumber).get();

        if (querySnapshot.empty) {
          functions.logger.error(`No se encontró en ${config.targetCollection} para IDPDV: ${pdvIdAsNumber}`);
          return null;
        }

        const batch = db.batch();
        querySnapshot.forEach(doc => {
          batch.update(doc.ref, { [config.implementationField]: true });
        });
        await batch.commit();
        return { success: true };

      } catch (error) {
        functions.logger.error(`Error al actualizar ${config.targetCollection} para ${config.logName}`, error);
        return null;
      }
    });
};
exports.markAsImplementedPospago = createImplementationMarker({ sourceCollection: 'Implementacion Pospago', targetCollection: 'Base Pospago', implementationField: 'implementado', logName: 'Pospago' });
exports.markAsImplementedPrepago = createImplementationMarker({ sourceCollection: 'Implementacion Prepago', targetCollection: 'Base Prepago', implementationField: 'implementado', logName: 'Prepago' });
exports.markAsImplementedDurable = createImplementationMarker({ sourceCollection: 'Implementacion Durable', targetCollection: 'Base Prepago', implementationField: 'implementado_durable', logName: 'Durable' });
exports.markAsImplementedActivacion = createImplementationMarker({ sourceCollection: 'Implementacion Activacion', targetCollection: 'Base Prepago', implementationField: 'implementado_activacion', logName: 'Activacion' });
exports.markAsImplementedAliados = createImplementationMarker({
    sourceCollection: 'Implementacion Aliados',
    targetCollection: 'Base Prepago',
    implementationField: 'implementado_aliados',
    logName: 'Aliados',
    sourceIdField: 'POS_ID'
});


// --- LÓGICA DE PROGRESO DE CALENDARIOS (SIN CAMBIOS) ---
const calculateProgress = async (branchName, collectionConfig) => {
    const progressRef = db.collection(collectionConfig.progressCollection).doc(String(branchName));
    try {
        await db.runTransaction(async (transaction) => {
            const progressDoc = await transaction.get(progressRef);
            const metaRef = db.collection(collectionConfig.metaCollection).doc(String(branchName));
            const metaDoc = await metaRef.get();
            const meta = metaDoc.exists ? metaDoc.data().meta : 0;

            if (!progressDoc.exists) {
                const conteo = 1;
                const porcentaje = meta > 0 ? (conteo / meta) * 100 : 0;
                transaction.set(progressRef, { BRANCH: branchName, meta: meta, conteo_implementado: conteo, porcentaje: porcentaje });
            } else {
                const data = progressDoc.data();
                const conteo = (data.conteo_implementado || 0) + 1;
                const porcentaje = meta > 0 ? (conteo / meta) * 100 : 0;
                transaction.update(progressRef, { conteo_implementado: conteo, porcentaje: porcentaje });
            }
        });
    } catch (error) {
        functions.logger.error(`Error en la transacción de progreso para ${branchName}`, error);
    }
};

const updateMeta = async (snap, context, collectionConfig) => {
    const branchName = context.params.sucursalId;
    const newMeta = snap.data().meta;
    const progressRef = db.collection(collectionConfig.progressCollection).doc(branchName);
    const progressDoc = await progressRef.get();
    if (progressDoc.exists) {
        const data = progressDoc.data();
        const conteo = data.conteo_implementado || 0;
        const porcentaje = newMeta > 0 ? (conteo / newMeta) * 100 : 0;
        await progressRef.update({ meta: newMeta, porcentaje: porcentaje });
    }
};
exports.calculateCalendariosProgress = functions.firestore.document("ImplementacionCalendarios/{docId}").onCreate((snap) => calculateProgress(snap.data().BRANCH, { progressCollection: 'ProgresoCalendarios', metaCollection: 'MetasCalendarios' }));
exports.updateCalendariosMeta = functions.firestore.document("MetasCalendarios/{sucursalId}").onWrite((change, context) => updateMeta(change.after, context, { progressCollection: 'ProgresoCalendarios' }));
exports.calculatePortaAfichesProgress = functions.firestore.document("ImplementacionPortaAfiches/{docId}").onCreate((snap) => calculateProgress(snap.data().BRANCH, { progressCollection: 'ProgresoPortaAfiches', metaCollection: 'MetasPortaAfiches' }));
exports.updatePortaAfichesMeta = functions.firestore.document("MetasPortaAfiches/{sucursalId}").onWrite((change, context) => updateMeta(change.after, context, { progressCollection: 'ProgresoPortaAfiches' }));


// --- FUNCIÓN DE ENRIQUECIMIENTO PARA PLANEACIÓN (SIN CAMBIOS) ---
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
