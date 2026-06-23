from rest_framework import serializers
from taggit.serializers import (TagListSerializerField,
                                TaggitSerializer)
from .models import Sample, Pack


class SampleSerializer(serializers.ModelSerializer):
    tags = TagListSerializerField()

    class Meta:
        model = Sample
        fields = '__all__'
        depth = 1


class PackSerializer(serializers.ModelSerializer):
    tags = TagListSerializerField()

    class Meta:
        model = Pack
        fields = '__all__'
