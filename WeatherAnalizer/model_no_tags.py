import tensorflow as tf
import numpy as np
from tensorflow import keras
from layers import CustomWeatherProcessingLayer
from dataloader import load_data, num_types, num_tags

NUM_TYPES = num_types()
NUM_TAGS = num_tags()

class OutfitWeatherModel(keras.Model):
    def __init__(self, num_types, num_tags):
        super().__init__()
        # Weather processing (Conv1D + LSTM)
        self.weather_processor = CustomWeatherProcessingLayer(
            out_dim=32,  
            conv_filters=32, 
            conv_kernel_size=3
        )
        
        # Types processing
        self.types_embedding = keras.layers.Embedding(
            input_dim=num_types + 1, 
            output_dim=64, 
            mask_zero=True
        )
        self.types_flatten = keras.layers.Flatten()
        
        # Hidden layers
        self.hidden128 = keras.layers.Dense(128, activation="leaky_relu", kernel_regularizer=keras.regularizers.l2(0.01))
        self.dropout = keras.layers.Dropout(0.5)
        self.hidden64 = keras.layers.Dense(64, activation="leaky_relu", kernel_regularizer=keras.regularizers.l2(0.01))
        self.hidden32 = keras.layers.Dense(32, activation="leaky_relu", kernel_regularizer=keras.regularizers.l2(0.01))

        self.output_layer = keras.layers.Dense(1, activation="sigmoid")

    def call(self, inputs):
        weather, types_indices = inputs
        
        # Process weather (batch_size, 32)
        weather_embed = self.weather_processor(weather)
        
        # Process tags (batch_size, num_items * 64)
        
        # Process types (batch_size, num_items * 64)
        types_embed = self.types_embedding(types_indices)
        mask = self.types_embedding.compute_mask(types_indices)
        mask = tf.expand_dims(mask, axis=-1)
        types_embed = types_embed * tf.cast(mask, types_embed.dtype)
        types_embed = self.types_flatten(types_embed)
        
        # Combine features
        combined = tf.concat([weather_embed, types_embed], axis=-1)
        x = self.hidden128(combined)
        x = self.dropout(x)
        x = self.hidden64(x)
        x = self.hidden32(x)
        return self.output_layer(x)

weather_data, _, types_data, labels = load_data()

# Generate a permutation of indices
indices = np.random.permutation(len(labels))

# Apply the permutation to all data arrays
weather_data = weather_data[indices]
types_data = types_data[indices]
labels = labels[indices]

print("Labels:", np.unique(labels, return_counts=True))

model = OutfitWeatherModel(NUM_TYPES, NUM_TAGS)

early_stopping = keras.callbacks.EarlyStopping(
    monitor="val_loss",
    patience=3,
    restore_best_weights=True
)
optimizer = keras.optimizers.Adam(learning_rate=1e-4)
loss = keras.losses.BinaryCrossentropy(label_smoothing=0.1)
model.compile(optimizer=optimizer, loss=loss, metrics=['accuracy'])

model.fit([weather_data, types_data], labels, epochs=10, batch_size=32, validation_split=0.2, callbacks=[early_stopping])
print(model.summary())