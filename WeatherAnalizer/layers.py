import tensorflow as tf
from tensorflow import keras

class CustomEmbeddingLayer(keras.layers.Layer):
    def __init__(self, input_dim, output_dim, aggregation="sum"):
        super().__init__()
        self.embedding = keras.layers.Embedding(
            input_dim=input_dim + 1,  # +1 for padding (0)
            output_dim=output_dim,
            mask_zero=True  # Critical to ignore padding
        )
        self.aggregation = aggregation
        self.flatten = keras.layers.Flatten()  # Track Flatten as a sub-layer

    def build(self, input_shape):
        # Build the embedding layer with the input shape
        self.embedding.build(input_shape)
        
        # Compute the output shape of the embedding layer (batch, num_items, num_tags, output_dim)
        embedding_output_shape = self.embedding.compute_output_shape(input_shape)
        
        # Compute the shape after aggregation (batch, num_items, output_dim)
        aggregated_shape = (embedding_output_shape[0], embedding_output_shape[1], self.embedding.output_dim)
        
        # Build the flatten layer with the aggregated shape
        self.flatten.build(aggregated_shape)
        
        # Mark the layer as built
        super().build(input_shape)

    def call(self, inputs):
        # inputs shape: (batch_size, num_items, num_tags)
        embeddings = self.embedding(inputs)  # (batch_size, num_items, num_tags, 64)
        
        # Mask padded tags
        mask = self.embedding.compute_mask(inputs)
        mask = tf.expand_dims(mask, axis=-1)  # (batch_size, num_items, num_tags, 1)
        embeddings = tf.where(mask, embeddings, 0.0)
        
        # Aggregate (sum/mean) over tags
        if self.aggregation == "sum":
            aggregated = tf.reduce_sum(embeddings, axis=2)  # (batch_size, num_items, 64)
        elif self.aggregation == "mean":
            valid_counts = tf.reduce_sum(tf.cast(mask, tf.float32), axis=2)  # (batch_size, num_items, 1)
            aggregated = tf.reduce_sum(embeddings, axis=2) / (valid_counts + 1e-8)
        else:
            raise ValueError("Aggregation must be 'sum' or 'mean'.")
        
        return self.flatten(aggregated)  # (batch_size, num_items * 64)
    
    def compute_output_shape(self, input_shape):
        return (input_shape[0], input_shape[1] * self.embedding.output_dim)
        
class CustomWeatherProcessingLayer(keras.layers.Layer):
    def __init__(self, out_dim=32, conv_filters=32, conv_kernel_size=3):
        super().__init__()
        self.conv1d = keras.layers.Conv1D(conv_filters, conv_kernel_size, activation="relu")
        self.flatten = keras.layers.Flatten()
        self.dense = keras.layers.Dense(out_dim, activation="relu")

    def build(self, input_shape):
        # Build sub-layers to ensure weights are tracked
        self.conv1d.build(input_shape)
        conv_output_shape = self.conv1d.compute_output_shape(input_shape)
        self.flatten.build(conv_output_shape)
        flattened_shape = self.flatten.compute_output_shape(conv_output_shape)
        self.dense.build(flattened_shape)
        
        # Mark the layer as built
        super().build(input_shape)

    def call(self, inputs):
        x = self.conv1d(inputs)
        x = self.flatten(x)
        return self.dense(x)

    def compute_output_shape(self, input_shape):
        return (input_shape[0], self.dense.units)